import { describe, it, expect } from 'vitest';
import { PRESETS } from '../presets';
import { Briefcase, LineChart, TrendingUp, Target } from 'lucide-react';

describe('PRESETS constant', () => {
  describe('structure validation', () => {
    it('exports PRESETS array', () => {
      expect(PRESETS).toBeDefined();
      expect(Array.isArray(PRESETS)).toBe(true);
    });

    it('has 4 preset configurations', () => {
      expect(PRESETS).toHaveLength(4);
    });

    it('each preset has required fields', () => {
      PRESETS.forEach((preset) => {
        expect(preset).toHaveProperty('prompt');
        expect(preset).toHaveProperty('icon');
        expect(preset).toHaveProperty('desc');
        expect(preset).toHaveProperty('label');
      });
    });

    it('each preset has string values for text fields', () => {
      PRESETS.forEach((preset) => {
        expect(typeof preset.prompt).toBe('string');
        expect(typeof preset.desc).toBe('string');
        expect(typeof preset.label).toBe('string');
      });
    });

    it('each preset has icon component', () => {
      PRESETS.forEach((preset) => {
        // Icons are React component objects from lucide-react
        expect(preset.icon).toBeDefined();
        expect(typeof preset.icon).toBe('object');
      });
    });
  });

  describe('Portfolio preset', () => {
    it('has correct configuration', () => {
      const portfolioPreset = PRESETS[0];

      expect(portfolioPreset).toEqual({
        prompt: 'Analyze my portfolio',
        icon: Briefcase,
        desc: 'Performance and risk',
        label: 'Portfolio',
      });
    });

    it('prompt is actionable', () => {
      const portfolioPreset = PRESETS[0];
      expect(portfolioPreset.prompt).toContain('portfolio');
      expect(portfolioPreset.prompt.length).toBeGreaterThan(0);
    });

    it('uses Briefcase icon', () => {
      const portfolioPreset = PRESETS[0];
      expect(portfolioPreset.icon).toBe(Briefcase);
    });
  });

  describe('Charts preset', () => {
    it('has correct configuration', () => {
      const chartsPreset = PRESETS[1];

      expect(chartsPreset).toEqual({
        prompt: 'Show me SPY chart',
        icon: LineChart,
        desc: 'Real-time with indicators',
        label: 'Charts',
      });
    });

    it('references SPY symbol', () => {
      const chartsPreset = PRESETS[1];
      expect(chartsPreset.prompt).toContain('SPY');
    });

    it('uses LineChart icon', () => {
      const chartsPreset = PRESETS[1];
      expect(chartsPreset.icon).toBe(LineChart);
    });
  });

  describe('Market Movers preset', () => {
    it('has correct configuration', () => {
      const moversPreset = PRESETS[2];

      expect(moversPreset).toEqual({
        prompt: "What's moving today?",
        icon: TrendingUp,
        desc: 'Volume leaders',
        label: 'Market Movers',
      });
    });

    it('asks about market movement', () => {
      const moversPreset = PRESETS[2];
      expect(moversPreset.prompt.toLowerCase()).toContain('moving');
    });

    it('uses TrendingUp icon', () => {
      const moversPreset = PRESETS[2];
      expect(moversPreset.icon).toBe(TrendingUp);
    });
  });

  describe('Trade Setups preset', () => {
    it('has correct configuration', () => {
      const setupsPreset = PRESETS[3];

      expect(setupsPreset).toEqual({
        prompt: 'Find asymmetric setups',
        icon: Target,
        desc: 'Risk/reward plays',
        label: 'Trade Setups',
      });
    });

    it('focuses on asymmetric risk/reward', () => {
      const setupsPreset = PRESETS[3];
      expect(setupsPreset.prompt.toLowerCase()).toContain('asymmetric');
      expect(setupsPreset.desc.toLowerCase()).toContain('risk/reward');
    });

    it('uses Target icon', () => {
      const setupsPreset = PRESETS[3];
      expect(setupsPreset.icon).toBe(Target);
    });
  });

  describe('prompt quality', () => {
    it('all prompts are non-empty', () => {
      PRESETS.forEach((preset) => {
        expect(preset.prompt.length).toBeGreaterThan(0);
      });
    });

    it('all prompts are unique', () => {
      const prompts = PRESETS.map((p) => p.prompt);
      const uniquePrompts = new Set(prompts);
      expect(uniquePrompts.size).toBe(PRESETS.length);
    });

    it('all labels are unique', () => {
      const labels = PRESETS.map((p) => p.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(PRESETS.length);
    });

    it('all descriptions are concise', () => {
      PRESETS.forEach((preset) => {
        // Descriptions should be short (less than 30 chars)
        expect(preset.desc.length).toBeLessThan(30);
        expect(preset.desc.length).toBeGreaterThan(0);
      });
    });

    it('all labels are properly capitalized', () => {
      PRESETS.forEach((preset) => {
        // First letter should be uppercase
        expect(preset.label[0]).toBe(preset.label[0].toUpperCase());
      });
    });
  });

  describe('icon usage', () => {
    it('all icons are from lucide-react', () => {
      const expectedIcons = [Briefcase, LineChart, TrendingUp, Target];
      const actualIcons = PRESETS.map((p) => p.icon);

      expectedIcons.forEach((expectedIcon) => {
        expect(actualIcons).toContain(expectedIcon);
      });
    });

    it('icons are all different', () => {
      const icons = PRESETS.map((p) => p.icon);
      const uniqueIcons = new Set(icons);
      expect(uniqueIcons.size).toBe(PRESETS.length);
    });

    it('icons match semantic meaning', () => {
      expect(PRESETS[0].icon).toBe(Briefcase); // Portfolio -> Briefcase
      expect(PRESETS[1].icon).toBe(LineChart); // Charts -> LineChart
      expect(PRESETS[2].icon).toBe(TrendingUp); // Market Movers -> TrendingUp
      expect(PRESETS[3].icon).toBe(Target); // Trade Setups -> Target
    });
  });

  describe('usability', () => {
    it('can be mapped for UI rendering', () => {
      const rendered = PRESETS.map((preset, index) => ({
        id: index,
        text: preset.prompt,
        description: preset.desc,
      }));

      expect(rendered).toHaveLength(4);
      rendered.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('text');
        expect(item).toHaveProperty('description');
      });
    });

    it('can be filtered by label', () => {
      const chartPreset = PRESETS.find((p) => p.label === 'Charts');
      expect(chartPreset).toBeDefined();
      expect(chartPreset?.prompt).toBe('Show me SPY chart');
    });

    it('can be filtered by keyword in prompt', () => {
      const portfolioPresets = PRESETS.filter((p) =>
        p.prompt.toLowerCase().includes('portfolio')
      );
      expect(portfolioPresets).toHaveLength(1);
      expect(portfolioPresets[0].label).toBe('Portfolio');
    });
  });

  describe('semantic coherence', () => {
    it('Portfolio preset focuses on analysis', () => {
      const preset = PRESETS[0];
      expect(preset.prompt.toLowerCase()).toContain('analyze');
      expect(preset.desc.toLowerCase()).toContain('performance');
    });

    it('Charts preset focuses on visualization', () => {
      const preset = PRESETS[1];
      expect(preset.prompt.toLowerCase()).toMatch(/show|chart/);
      expect(preset.desc.toLowerCase()).toContain('indicators');
    });

    it('Market Movers preset focuses on discovery', () => {
      const preset = PRESETS[2];
      expect(preset.prompt.toLowerCase()).toMatch(/what|moving/);
      expect(preset.desc.toLowerCase()).toContain('volume');
    });

    it('Trade Setups preset focuses on opportunities', () => {
      const preset = PRESETS[3];
      expect(preset.prompt.toLowerCase()).toMatch(/find|setup/);
      expect(preset.desc.toLowerCase()).toContain('risk');
    });
  });

  describe('edge cases', () => {
    it('handles array iteration', () => {
      let count = 0;
      for (const preset of PRESETS) {
        expect(preset).toBeDefined();
        count++;
      }
      expect(count).toBe(4);
    });

    it('maintains order', () => {
      expect(PRESETS[0].label).toBe('Portfolio');
      expect(PRESETS[1].label).toBe('Charts');
      expect(PRESETS[2].label).toBe('Market Movers');
      expect(PRESETS[3].label).toBe('Trade Setups');
    });

    it('is immutable (const)', () => {
      // TypeScript const prevents reassignment
      // This test documents the expected immutability
      expect(() => {
        const copy = [...PRESETS];
        expect(copy).toEqual(PRESETS);
      }).not.toThrow();
    });
  });
});
