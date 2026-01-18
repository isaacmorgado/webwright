import { describe, it, expect } from 'vitest'
import { analyzeTask, getAvailableTools } from '../../src/lib/task-analyzer'

describe('Task Analyzer', () => {
  describe('analyzeTask', () => {
    describe('Intent Detection', () => {
      it('should detect api_discovery intent', () => {
        const prompts = [
          'discover all API endpoints from https://example.com',
          'find all API endpoints from example.com',
          'what API does example.com use',
          'api endpoint discovery from https://example.com',
        ]

        prompts.forEach(prompt => {
          const result = analyzeTask(prompt)
          expect(result.type).toBe('api_discovery')
          expect(result.confidence).toBeGreaterThan(0.5)
        })
      })

      it('should detect ui_extraction intent', () => {
        const prompts = [
          'extract the UI elements from https://example.com',
          'get all components from example.com',
          'list all buttons and inputs from https://example.com',
          'accessibility tree from example.com',
          'dom structure from https://example.com',
        ]

        prompts.forEach(prompt => {
          const result = analyzeTask(prompt)
          expect(result.type).toBe('ui_extraction')
          expect(result.confidence).toBeGreaterThan(0.5)
        })
      })

      it('should detect ui_clone intent', () => {
        const prompts = [
          'clone the UI from https://stripe.com',
          'copy the design from example.com',
          'recreate the interface from https://example.com',
          'screenshot to code from https://example.com',
          'replicate the design from https://github.com',
        ]

        prompts.forEach(prompt => {
          const result = analyzeTask(prompt)
          expect(result.type).toBe('ui_clone')
          expect(result.confidence).toBeGreaterThan(0.5)
        })
      })

      it('should detect traffic_capture intent', () => {
        const prompts = [
          'capture all traffic from https://example.com',
          'intercept requests from example.com',
          'proxy traffic from https://example.com',
          'record network requests from example.com',
        ]

        prompts.forEach(prompt => {
          const result = analyzeTask(prompt)
          expect(result.type).toBe('traffic_capture')
          expect(result.confidence).toBeGreaterThan(0.5)
        })
      })

      it('should detect graphql_schema intent', () => {
        const prompts = [
          'graphql schema from https://api.example.com/graphql',
          'extract graphql from example.com',
          'discover graphql endpoints',
          'graphql introspection on example.com',
        ]

        prompts.forEach(prompt => {
          const result = analyzeTask(prompt)
          expect(result.type).toBe('graphql_schema')
          expect(result.confidence).toBeGreaterThan(0.5)
        })
      })

      it('should detect stealth_scrape intent', () => {
        const prompts = [
          'scrape data with stealth mode',
          'bypass bot detection on example.com',
          'undetected scraping from example.com',
          'scrape without getting blocked',
        ]

        prompts.forEach(prompt => {
          const result = analyzeTask(prompt)
          expect(result.type).toBe('stealth_scrape')
          expect(result.confidence).toBeGreaterThan(0.5)
        })
      })

      it('should detect full_reverse_engineer intent', () => {
        const prompts = [
          'reverse engineer this website https://example.com',
          'fully reverse engineer example.com',
          'complete RE of https://example.com',
          'analyze everything on example.com',
        ]

        prompts.forEach(prompt => {
          const result = analyzeTask(prompt)
          expect(result.type).toBe('full_reverse_engineer')
          expect(result.confidence).toBeGreaterThan(0.3)
        })
      })

      it('should default to full_reverse_engineer for ambiguous tasks', () => {
        const result = analyzeTask('do something with example.com')
        expect(result.type).toBe('full_reverse_engineer')
        expect(result.confidence).toBe(0.3)
      })
    })

    describe('URL Extraction', () => {
      it('should extract full URLs', () => {
        const result = analyzeTask('analyze https://example.com/api/v1')
        expect(result.targetUrl).toBe('https://example.com/api/v1')
      })

      it('should extract URLs with query parameters', () => {
        const result = analyzeTask('analyze https://example.com/page?id=123&type=test')
        expect(result.targetUrl).toBe('https://example.com/page?id=123&type=test')
      })

      it('should convert domain-like patterns to URLs', () => {
        const result = analyzeTask('analyze example.com')
        expect(result.targetUrl).toBe('https://example.com')
      })

      it('should handle "from domain" patterns', () => {
        const result = analyzeTask('extract UI from example.com')
        expect(result.targetUrl).toBe('https://example.com')
      })

      it('should return undefined when no URL is found', () => {
        const result = analyzeTask('do something')
        expect(result.targetUrl).toBeUndefined()
      })
    })

    describe('Tool Selection', () => {
      it('should select webwright_stealth for all task types', () => {
        const types = ['api_discovery', 'ui_extraction', 'ui_clone', 'stealth_scrape', 'full_reverse_engineer']
        types.forEach(type => {
          const result = analyzeTask(`${type.replace(/_/g, ' ')} from example.com`)
          expect(result.tools).toContain('webwright_stealth')
        })
      })

      it('should include chrome_devtools for api_discovery', () => {
        const result = analyzeTask('discover API from example.com')
        expect(result.tools).toContain('chrome_devtools')
      })

      it('should include screenshot_to_code for ui_clone', () => {
        const result = analyzeTask('clone UI from example.com')
        expect(result.tools).toContain('screenshot_to_code')
      })

      it('should include clairvoyance for graphql_schema', () => {
        const result = analyzeTask('graphql schema from example.com')
        expect(result.tools).toContain('clairvoyance')
      })

      it('should include mitmproxy for traffic_capture', () => {
        const result = analyzeTask('capture traffic from example.com')
        expect(result.tools).toContain('mitmproxy')
      })
    })

    describe('Workflow Generation', () => {
      it('should generate workflow steps', () => {
        const result = analyzeTask('reverse engineer https://example.com')
        expect(result.workflow).toBeDefined()
        expect(result.workflow.length).toBeGreaterThan(0)
      })

      it('should include navigate step first', () => {
        const result = analyzeTask('reverse engineer https://example.com')
        expect(result.workflow[0].action).toBe('navigate')
        expect(result.workflow[0].params.url).toBe('https://example.com')
      })

      it('should include step dependencies', () => {
        const result = analyzeTask('reverse engineer https://example.com')
        const dependentSteps = result.workflow.filter(s => s.dependsOn && s.dependsOn.length > 0)
        expect(dependentSteps.length).toBeGreaterThan(0)
      })

      it('should generate unique step IDs', () => {
        const result = analyzeTask('reverse engineer https://example.com')
        const ids = result.workflow.map(s => s.id)
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(ids.length)
      })
    })

    describe('Confidence Scoring', () => {
      it('should have higher confidence for specific matches', () => {
        const specific = analyzeTask('discover all API endpoints from https://example.com')
        const vague = analyzeTask('do something with example.com')
        expect(specific.confidence).toBeGreaterThan(vague.confidence)
      })

      it('should cap confidence at 0.95', () => {
        const result = analyzeTask('discover all API endpoints from https://example.com/api/v1/users/posts')
        expect(result.confidence).toBeLessThanOrEqual(0.95)
      })

      it('should have minimum confidence of 0.3', () => {
        const result = analyzeTask('xyz')
        expect(result.confidence).toBeGreaterThanOrEqual(0.3)
      })
    })

    describe('Description Generation', () => {
      it('should include target URL in description', () => {
        const result = analyzeTask('reverse engineer https://example.com')
        expect(result.description).toContain('example.com')
      })

      it('should describe the task type', () => {
        const result = analyzeTask('discover API from example.com')
        expect(result.description.toLowerCase()).toContain('api')
      })
    })
  })

  describe('getAvailableTools', () => {
    it('should return tool definitions', () => {
      const tools = getAvailableTools()
      expect(tools).toBeDefined()
      expect(Object.keys(tools).length).toBeGreaterThan(0)
    })

    it('should include webwright_stealth', () => {
      const tools = getAvailableTools()
      expect(tools.webwright_stealth).toBeDefined()
      expect(tools.webwright_stealth.capabilities).toContain('navigate')
    })

    it('should include mitmproxy', () => {
      const tools = getAvailableTools()
      expect(tools.mitmproxy).toBeDefined()
      expect(tools.mitmproxy.capabilities).toContain('capture')
    })
  })
})
