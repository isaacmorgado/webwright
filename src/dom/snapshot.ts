/**
 * DOM Snapshot System - Ref-based accessibility tree
 * Adapted from agent-browser/src/snapshot.ts with browser-use multi-source fusion
 */

import type { Page, Frame, Locator } from 'playwright-core';
import type { RefMap, RefData, EnhancedAXNode, EnhancedDOMTreeNode } from '../core/types.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Interactive ARIA roles that should receive refs
 */
const INTERACTIVE_ROLES = new Set([
  'button',
  'checkbox',
  'combobox',
  'link',
  'listbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
  'treeitem',
]);

/**
 * Roles that should include value/text content
 */
const VALUE_ROLES = new Set([
  'textbox',
  'searchbox',
  'combobox',
  'spinbutton',
  'slider',
]);

/**
 * State attributes to include in output
 */
const STATE_ATTRIBUTES = [
  'checked',
  'disabled',
  'expanded',
  'pressed',
  'selected',
  'required',
  'invalid',
  'readonly',
  'busy',
];

// ============================================================================
// Ref Counter
// ============================================================================

let refCounter = 0;

function nextRef(): string {
  return `e${++refCounter}`;
}

export function resetRefs(): void {
  refCounter = 0;
}

// ============================================================================
// Ref Parsing
// ============================================================================

/**
 * Parse a ref from command argument
 * Supports: "@e1", "e1", "ref=e1"
 */
export function parseRef(arg: string): string | null {
  if (arg.startsWith('@')) {
    return arg.slice(1);
  }
  if (arg.startsWith('ref=')) {
    return arg.slice(4);
  }
  if (/^e\d+$/.test(arg)) {
    return arg;
  }
  return null;
}

// ============================================================================
// Snapshot Options
// ============================================================================

export interface SnapshotOptions {
  /** Selector to scope the snapshot */
  selector?: string;
  /** Only include interactive elements */
  interactive?: boolean;
  /** Maximum depth to traverse */
  depth?: number;
  /** Include hidden elements */
  includeHidden?: boolean;
  /** Compact output mode (single line per element) */
  compact?: boolean;
}

export interface EnhancedSnapshot {
  tree: string;
  refs: RefMap;
}

// ============================================================================
// Role/Name Tracker for Disambiguation
// ============================================================================

interface RoleNameTracker {
  /** Track occurrences: role:name -> count */
  counts: Map<string, number>;
  /** Track which refs have been assigned: role:name -> refs[] */
  refs: Map<string, string[]>;
  /** Get next index for this role/name combo */
  getNextIndex(role: string, name?: string): number;
  /** Track a ref for this role/name */
  trackRef(role: string, name: string | undefined, ref: string): void;
}

function createRoleNameTracker(): RoleNameTracker {
  const counts = new Map<string, number>();
  const refs = new Map<string, string[]>();

  return {
    counts,
    refs,
    getNextIndex(role: string, name?: string): number {
      const key = `${role}:${name ?? ''}`;
      const current = counts.get(key) ?? 0;
      counts.set(key, current + 1);
      return current;
    },
    trackRef(role: string, name: string | undefined, ref: string): void {
      const key = `${role}:${name ?? ''}`;
      const existing = refs.get(key) ?? [];
      existing.push(ref);
      refs.set(key, existing);
    },
  };
}

// ============================================================================
// Selector Builder
// ============================================================================

function buildSelector(role: string, name?: string): string {
  if (name) {
    // Escape quotes in name
    const escapedName = name.replace(/"/g, '\\"');
    return `role=${role}[name="${escapedName}"]`;
  }
  return `role=${role}`;
}

// ============================================================================
// Post-Processing: Remove nth from non-duplicates
// ============================================================================

function removeNthFromNonDuplicates(refs: RefMap, tracker: RoleNameTracker): void {
  for (const [key, refList] of tracker.refs.entries()) {
    // If only one ref for this role/name, remove nth
    if (refList.length === 1) {
      const ref = refList[0];
      if (refs[ref]) {
        delete refs[ref].nth;
      }
    }
  }
}

// ============================================================================
// Main Snapshot Functions
// ============================================================================

/**
 * Get enhanced snapshot with refs and optional filtering
 */
export async function getEnhancedSnapshot(
  page: Page,
  options: SnapshotOptions = {}
): Promise<EnhancedSnapshot> {
  resetRefs();
  const refs: RefMap = {};

  // Get ARIA snapshot from Playwright
  const locator = options.selector ? page.locator(options.selector) : page.locator(':root');
  const ariaTree = await locator.ariaSnapshot();

  if (!ariaTree) {
    return { tree: '(empty)', refs: {} };
  }

  // Parse and enhance the ARIA tree
  const enhancedTree = processAriaTree(ariaTree, refs, options);

  return { tree: enhancedTree, refs };
}

/**
 * Process ARIA snapshot: add refs and apply filters
 */
function processAriaTree(
  ariaTree: string,
  refs: RefMap,
  options: SnapshotOptions
): string {
  const lines = ariaTree.split('\n');
  const result: string[] = [];
  const tracker = createRoleNameTracker();

  // Track current depth based on indentation
  let maxDepth = options.depth ?? Infinity;

  for (const line of lines) {
    // Parse line format: "  - role "name" [attrs]"
    const match = line.match(/^(\s*-\s*)(\w+)(?:\s+"([^"]*)")?(.*)$/);
    if (!match) continue;

    const [, indent, role, name, suffix] = match;
    const roleLower = role.toLowerCase();

    // Calculate depth (2 spaces per level)
    const depth = (line.length - line.trimStart().length) / 2;
    if (depth > maxDepth) continue;

    // Interactive-only filter
    if (options.interactive && !INTERACTIVE_ROLES.has(roleLower)) {
      continue;
    }

    // Generate ref for interactive elements
    let enhanced = `${indent}${role}`;
    if (name) {
      enhanced += ` "${name}"`;
    }

    if (INTERACTIVE_ROLES.has(roleLower)) {
      const ref = nextRef();
      const nth = tracker.getNextIndex(roleLower, name);
      tracker.trackRef(roleLower, name, ref);

      refs[ref] = {
        selector: buildSelector(roleLower, name),
        role: roleLower,
        name,
        nth,
      };

      enhanced += ` [ref=${ref}]`;
      if (nth > 0) {
        enhanced += ` [nth=${nth}]`;
      }
    }

    // Preserve existing attributes from suffix
    if (suffix) {
      // Extract state attributes
      const stateMatches = suffix.match(/\[([a-z]+)(?:=([^\]]+))?\]/gi);
      if (stateMatches) {
        for (const stateMatch of stateMatches) {
          // Only add if not already a ref
          if (!stateMatch.startsWith('[ref=') && !stateMatch.startsWith('[nth=')) {
            enhanced += ` ${stateMatch}`;
          }
        }
      }
    }

    result.push(enhanced);
  }

  // Post-process: remove nth from refs that don't have duplicates
  removeNthFromNonDuplicates(refs, tracker);

  // Update result to remove [nth=0] from non-duplicate refs
  const finalResult = result.map((line) => {
    // Find ref in line
    const refMatch = line.match(/\[ref=(e\d+)\]/);
    if (refMatch) {
      const ref = refMatch[1];
      if (refs[ref] && refs[ref].nth === undefined) {
        // Remove [nth=0] if present
        return line.replace(/\s*\[nth=0\]/, '');
      }
    }
    return line;
  });

  // Apply compact mode if requested
  if (options.compact) {
    // Compact format: role "name" [ref=e1] - single line, minimal indentation
    return finalResult
      .map((line) => line.trim().replace(/^-\s*/, ''))
      .filter((line) => line.length > 0)
      .join(' | ');
  }

  return finalResult.length > 0 ? finalResult.join('\n') : '(no interactive elements)';
}

/**
 * Get full DOM tree with multi-source fusion (from browser-use)
 * Combines accessibility tree, DOM snapshot, and visibility info
 */
export async function getFullDOMTree(
  page: Page,
  options: SnapshotOptions = {}
): Promise<EnhancedDOMTreeNode | null> {
  const client = await page.context().newCDPSession(page);

  try {
    // Parallel CDP requests for multi-source fusion
    const [domTree, axTree, snapshot] = await Promise.all([
      client.send('DOM.getDocument', { depth: -1, pierce: true }),
      client.send('Accessibility.getFullAXTree'),
      client.send('DOMSnapshot.captureSnapshot', {
        computedStyles: ['display', 'visibility', 'opacity', 'pointer-events'],
        includePaintOrder: true,
        includeDOMRects: true,
      }),
    ]);

    // Build enhanced tree by fusing sources
    const enhanced = fuseMultiSourceDOM(
      domTree.root,
      axTree.nodes,
      snapshot,
      options
    );

    return enhanced;
  } finally {
    await client.detach().catch(() => {});
  }
}

/**
 * Fuse multiple CDP sources into enhanced DOM tree
 */
function fuseMultiSourceDOM(
  domRoot: any,
  axNodes: any[],
  snapshot: any,
  options: SnapshotOptions
): EnhancedDOMTreeNode {
  // Build AX node lookup by backendNodeId
  const axLookup = new Map<number, any>();
  for (const node of axNodes) {
    if (node.backendDOMNodeId) {
      axLookup.set(node.backendDOMNodeId, node);
    }
  }

  // Build snapshot node lookup by backendNodeId
  const snapshotLookup = new Map<number, any>();
  if (snapshot.documents) {
    for (const doc of snapshot.documents) {
      const nodes = doc.nodes;
      if (nodes?.backendNodeId) {
        for (let i = 0; i < nodes.backendNodeId.length; i++) {
          snapshotLookup.set(nodes.backendNodeId[i], {
            nodeType: nodes.nodeType?.[i],
            nodeName: nodes.nodeName?.[i],
            nodeValue: nodes.nodeValue?.[i],
            boundingBox: nodes.boundingBox?.[i],
            paintOrder: nodes.paintOrder?.[i],
          });
        }
      }
    }
  }

  // Recursively build enhanced tree
  function buildNode(domNode: any, depth: number): EnhancedDOMTreeNode | null {
    if (options.depth !== undefined && depth > options.depth) {
      return null;
    }

    const backendNodeId = domNode.backendNodeId;
    const axNode = axLookup.get(backendNodeId);
    const snapshotNode = snapshotLookup.get(backendNodeId);

    // Extract attributes
    const attributes: Record<string, string> = {};
    if (domNode.attributes) {
      for (let i = 0; i < domNode.attributes.length; i += 2) {
        attributes[domNode.attributes[i]] = domNode.attributes[i + 1];
      }
    }

    // Build enhanced node
    const enhanced: EnhancedDOMTreeNode = {
      nodeId: domNode.nodeId,
      backendNodeId,
      nodeType: getNodeType(domNode.nodeType),
      nodeName: domNode.nodeName,
      nodeValue: domNode.nodeValue,
      attributes,
      isVisible: isNodeVisible(snapshotNode, attributes),
      absolutePosition: snapshotNode?.boundingBox,
      axNode: axNode ? {
        nodeId: axNode.nodeId,
        role: axNode.role?.value ?? 'none',
        name: axNode.name?.value,
        description: axNode.description?.value,
        value: axNode.value?.value,
        checked: axNode.checked?.value,
        selected: axNode.selected?.value,
        expanded: axNode.expanded?.value,
        disabled: axNode.disabled?.value,
        focused: axNode.focused?.value,
        level: axNode.level?.value,
      } : undefined,
      snapshotNode: snapshotNode ? {
        nodeType: snapshotNode.nodeType,
        nodeName: snapshotNode.nodeName,
        nodeValue: snapshotNode.nodeValue,
        backendNodeId,
        boundingBox: snapshotNode.boundingBox,
        paintOrder: snapshotNode.paintOrder,
      } : undefined,
    };

    // Process children
    if (domNode.children) {
      enhanced.childrenNodes = domNode.children
        .map((child: any) => buildNode(child, depth + 1))
        .filter((n: any): n is EnhancedDOMTreeNode => n !== null);
    }

    // Skip hidden elements if requested
    if (!options.includeHidden && !enhanced.isVisible) {
      return null;
    }

    return enhanced;
  }

  return buildNode(domRoot, 0) ?? {
    nodeId: 0,
    backendNodeId: 0,
    nodeType: 'document',
    nodeName: '#document',
    attributes: {},
  };
}

function getNodeType(type: number): 'element' | 'text' | 'document' | 'documentType' | 'documentFragment' | 'comment' {
  switch (type) {
    case 1: return 'element';
    case 3: return 'text';
    case 9: return 'document';
    case 10: return 'documentType';
    case 11: return 'documentFragment';
    case 8: return 'comment';
    default: return 'element';
  }
}

function isNodeVisible(snapshotNode: any, attributes: Record<string, string>): boolean {
  if (!snapshotNode) return true; // Assume visible if no snapshot data

  const style = attributes.style ?? '';
  if (style.includes('display: none') || style.includes('visibility: hidden')) {
    return false;
  }

  // Check bounding box
  if (snapshotNode.boundingBox) {
    const box = snapshotNode.boundingBox;
    if (box.width === 0 && box.height === 0) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert snapshot tree to markdown for LLM consumption
 */
export function snapshotToMarkdown(tree: string): string {
  // The tree is already in a readable format, just clean it up
  return tree
    .split('\n')
    .map((line) => {
      // Convert YAML-like format to markdown list
      const match = line.match(/^(\s*)-\s*(.*)$/);
      if (match) {
        const [, indent, content] = match;
        return `${indent}- ${content}`;
      }
      return line;
    })
    .join('\n');
}

/**
 * Find element by ref in the DOM tree
 */
export function findElementByRef(
  tree: EnhancedDOMTreeNode,
  ref: string,
  refs: RefMap
): EnhancedDOMTreeNode | null {
  const refData = refs[ref];
  if (!refData) return null;

  function search(node: EnhancedDOMTreeNode): EnhancedDOMTreeNode | null {
    // Check if this node matches
    if (node.axNode?.role === refData.role) {
      if (!refData.name || node.axNode?.name === refData.name) {
        return node;
      }
    }

    // Search children
    if (node.childrenNodes) {
      for (const child of node.childrenNodes) {
        const found = search(child);
        if (found) return found;
      }
    }

    return null;
  }

  return search(tree);
}
