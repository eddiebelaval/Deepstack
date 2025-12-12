import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThesisTracker, Thesis } from '../ThesisTracker';

describe('ThesisTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders thesis tracker with header', () => {
      render(<ThesisTracker />);

      expect(screen.getByText('Thesis Tracker')).toBeInTheDocument();
    });

    it('displays active theses count', () => {
      render(<ThesisTracker />);

      expect(screen.getByText('0 active')).toBeInTheDocument();
    });

    it('shows online status indicator', () => {
      render(<ThesisTracker />);

      const cloudIcon = document.querySelector('.lucide-cloud');
      expect(cloudIcon).toBeInTheDocument();
      expect(cloudIcon).toHaveClass('text-green-500');
    });

    it('renders new thesis form', () => {
      render(<ThesisTracker />);

      expect(screen.getByText('New Thesis')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('AAPL')).toBeInTheDocument();
    });

    it('shows all four tabs', () => {
      render(<ThesisTracker />);

      expect(screen.getByText(/Active \(0\)/)).toBeInTheDocument();
      expect(screen.getByText(/Monitoring \(0\)/)).toBeInTheDocument();
      expect(screen.getByText(/Validated \(0\)/)).toBeInTheDocument();
      expect(screen.getByText(/Invalidated \(0\)/)).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders all required form fields', () => {
      render(<ThesisTracker />);

      expect(screen.getByPlaceholderText('AAPL')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Brief thesis title')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...')).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText('0.00')).toHaveLength(2); // Target Price and Stop Loss
      expect(screen.getByPlaceholderText('earnings growth, market share, new product')).toBeInTheDocument();
      // Check labels are rendered
      expect(screen.getByText('Symbol')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Hypothesis')).toBeInTheDocument();
      expect(screen.getByText('Timeframe')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('symbol input converts to uppercase', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'tsla');

      expect(symbolInput).toHaveValue('TSLA');
    });

    it('updates title input', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const titleInput = screen.getByPlaceholderText('Brief thesis title');
      await user.type(titleInput, 'AI Revolution');

      expect(titleInput).toHaveValue('AI Revolution');
    });

    it('updates hypothesis textarea', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const hypothesisInput = screen.getByPlaceholderText(
        'Detailed thesis hypothesis and rationale...'
      );
      await user.type(hypothesisInput, 'Company will benefit from AI adoption');

      expect(hypothesisInput).toHaveValue('Company will benefit from AI adoption');
    });

    it('updates target price input', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Find the first 0.00 placeholder (Target Price)
      const priceInputs = screen.getAllByPlaceholderText('0.00');
      const targetPriceInput = priceInputs[0];
      await user.type(targetPriceInput, '200.50');

      expect(targetPriceInput).toHaveValue(200.5);
    });

    it('updates stop loss input', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Find the second 0.00 placeholder (Stop Loss)
      const priceInputs = screen.getAllByPlaceholderText('0.00');
      const stopLossInput = priceInputs[1];
      await user.type(stopLossInput, '150.00');

      expect(stopLossInput).toHaveValue(150);
    });

    it('updates key factors input', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const keyFactorsInput = screen.getByPlaceholderText(
        'earnings growth, market share, new product'
      );
      await user.type(keyFactorsInput, 'AI revenue, cloud growth');

      expect(keyFactorsInput).toHaveValue('AI revenue, cloud growth');
    });
  });

  describe('Timeframe Selection', () => {
    it('defaults to medium timeframe', () => {
      render(<ThesisTracker />);

      // Find by the trigger button that shows the selected value
      expect(screen.getByText('Medium (3-12M)')).toBeInTheDocument();
    });

    it('shows all timeframe options', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Find all comboboxes - there are 2: Timeframe and Status
      const comboboxes = screen.getAllByRole('combobox');
      // The first one should be Timeframe (index 0)
      await user.click(comboboxes[0]);

      // Wait for options to appear
      await waitFor(
        () => {
          expect(screen.getByRole('option', { name: 'Short (0-3M)' })).toBeInTheDocument();
          expect(screen.getByRole('option', { name: 'Medium (3-12M)' })).toBeInTheDocument();
          expect(screen.getByRole('option', { name: 'Long (12M+)' })).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('can select short timeframe', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Click the first combobox (Timeframe)
      const comboboxes = screen.getAllByRole('combobox');
      await user.click(comboboxes[0]);

      // Select short option
      const shortOption = await screen.findByRole('option', { name: 'Short (0-3M)' });
      await user.click(shortOption);

      // Verify it's selected - the combobox should now show Short
      await waitFor(() => {
        const updatedComboboxes = screen.getAllByRole('combobox');
        expect(updatedComboboxes[0]).toHaveTextContent('Short (0-3M)');
      });
    });

    it('can select long timeframe', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Click the first combobox (Timeframe)
      const comboboxes = screen.getAllByRole('combobox');
      await user.click(comboboxes[0]);

      // Select long option
      const longOption = await screen.findByRole('option', { name: 'Long (12M+)' });
      await user.click(longOption);

      // Verify it's selected
      await waitFor(() => {
        const updatedComboboxes = screen.getAllByRole('combobox');
        expect(updatedComboboxes[0]).toHaveTextContent('Long (12M+)');
      });
    });
  });

  describe('Status Selection', () => {
    it('defaults to active status', () => {
      render(<ThesisTracker />);

      // Find by the trigger button that shows the selected value
      const activeTriggers = screen.getAllByText('Active');
      // Should have at least the select trigger and the tab
      expect(activeTriggers.length).toBeGreaterThan(0);
    });

    it('shows all status options', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Click the second combobox (Status)
      const comboboxes = screen.getAllByRole('combobox');
      await user.click(comboboxes[1]);

      // Wait for options to appear
      await waitFor(
        () => {
          expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
          expect(screen.getByRole('option', { name: 'Monitoring' })).toBeInTheDocument();
          expect(screen.getByRole('option', { name: 'Validated' })).toBeInTheDocument();
          expect(screen.getByRole('option', { name: 'Invalidated' })).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('can select monitoring status', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Click the second combobox (Status)
      const comboboxes = screen.getAllByRole('combobox');
      await user.click(comboboxes[1]);

      // Select monitoring option
      const monitoringOption = await screen.findByRole('option', { name: 'Monitoring' });
      await user.click(monitoringOption);

      // Verify it's selected
      await waitFor(() => {
        const updatedComboboxes = screen.getAllByRole('combobox');
        expect(updatedComboboxes[1]).toHaveTextContent('Monitoring');
      });
    });
  });

  describe('Form Validation', () => {
    it('requires symbol to add thesis', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const titleInput = screen.getByPlaceholderText('Brief thesis title');
      await user.type(titleInput, 'Test Thesis');

      const hypothesisInput = screen.getByPlaceholderText(
        'Detailed thesis hypothesis and rationale...'
      );
      await user.type(hypothesisInput, 'Test hypothesis');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      // Should not add (still 0 active)
      expect(screen.getByText('0 active')).toBeInTheDocument();
    });

    it('requires title to add thesis', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'AAPL');

      const hypothesisInput = screen.getByPlaceholderText(
        'Detailed thesis hypothesis and rationale...'
      );
      await user.type(hypothesisInput, 'Test hypothesis');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(screen.getByText('0 active')).toBeInTheDocument();
    });

    it('requires hypothesis to add thesis', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'AAPL');

      const titleInput = screen.getByPlaceholderText('Brief thesis title');
      await user.type(titleInput, 'Test Thesis');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(screen.getByText('0 active')).toBeInTheDocument();
    });
  });

  describe('Adding Thesis', () => {
    it('adds thesis with all required fields', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'AAPL');

      const titleInput = screen.getByPlaceholderText('Brief thesis title');
      await user.type(titleInput, 'AI Services Growth');

      const hypothesisInput = screen.getByPlaceholderText(
        'Detailed thesis hypothesis and rationale...'
      );
      await user.type(hypothesisInput, 'Apple will monetize AI through services');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('1 active')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });
    });

    it('adds thesis with optional fields', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'NVDA');

      const titleInput = screen.getByPlaceholderText('Brief thesis title');
      await user.type(titleInput, 'AI Chip Dominance');

      const hypothesisInput = screen.getByPlaceholderText(
        'Detailed thesis hypothesis and rationale...'
      );
      await user.type(hypothesisInput, 'NVIDIA will dominate AI chip market');

      const priceInputs = screen.getAllByPlaceholderText('0.00');
      await user.type(priceInputs[0], '800.00'); // Target Price
      await user.type(priceInputs[1], '600.00'); // Stop Loss

      const keyFactorsInput = screen.getByPlaceholderText(
        'earnings growth, market share, new product'
      );
      await user.type(keyFactorsInput, 'GPU demand, AI adoption, market share');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('NVDA')).toBeInTheDocument();
        expect(screen.getByText('AI Chip Dominance')).toBeInTheDocument();
      });
    });

    it('trims whitespace from symbol', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, '  MSFT  ');

      const titleInput = screen.getByPlaceholderText('Brief thesis title');
      await user.type(titleInput, 'Test');

      const hypothesisInput = screen.getByPlaceholderText(
        'Detailed thesis hypothesis and rationale...'
      );
      await user.type(hypothesisInput, 'Test hypothesis');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('MSFT')).toBeInTheDocument();
      });
    });

    it('trims whitespace from title', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'AAPL');

      const titleInput = screen.getByPlaceholderText('Brief thesis title');
      await user.type(titleInput, '  Cloud Growth  ');

      const hypothesisInput = screen.getByPlaceholderText(
        'Detailed thesis hypothesis and rationale...'
      );
      await user.type(hypothesisInput, 'Test hypothesis');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Cloud Growth')).toBeInTheDocument();
      });
    });
  });

  describe('Key Factors Parsing', () => {
    it('parses comma-separated key factors', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'AAPL');

      const titleInput = screen.getByPlaceholderText('Brief thesis title');
      await user.type(titleInput, 'Test Thesis');

      const hypothesisInput = screen.getByPlaceholderText(
        'Detailed thesis hypothesis and rationale...'
      );
      await user.type(hypothesisInput, 'Test hypothesis');

      const keyFactorsInput = screen.getByPlaceholderText(
        'earnings growth, market share, new product'
      );
      await user.type(keyFactorsInput, 'revenue growth, margin expansion, market share');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('revenue growth')).toBeInTheDocument();
        expect(screen.getByText('margin expansion')).toBeInTheDocument();
        expect(screen.getByText('market share')).toBeInTheDocument();
      });
    });

    it('handles key factors with extra spaces', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'AAPL');

      const titleInput = screen.getByPlaceholderText('Brief thesis title');
      await user.type(titleInput, 'Test Thesis');

      const hypothesisInput = screen.getByPlaceholderText(
        'Detailed thesis hypothesis and rationale...'
      );
      await user.type(hypothesisInput, 'Test hypothesis');

      const keyFactorsInput = screen.getByPlaceholderText(
        'earnings growth, market share, new product'
      );
      await user.type(keyFactorsInput, '  factor1  ,  factor2  ,  factor3  ');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('factor1')).toBeInTheDocument();
        expect(screen.getByText('factor2')).toBeInTheDocument();
        expect(screen.getByText('factor3')).toBeInTheDocument();
      });
    });
  });

  describe('Form Reset After Submission', () => {
    it('resets form after adding thesis', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'AAPL');

      const titleInput = screen.getByPlaceholderText('Brief thesis title');
      await user.type(titleInput, 'Test Thesis');

      const hypothesisInput = screen.getByPlaceholderText(
        'Detailed thesis hypothesis and rationale...'
      );
      await user.type(hypothesisInput, 'Test hypothesis');

      const priceInputs = screen.getAllByPlaceholderText('0.00');
      await user.type(priceInputs[0], '200');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(symbolInput).toHaveValue('');
        expect(titleInput).toHaveValue('');
        expect(hypothesisInput).toHaveValue('');
        expect(priceInputs[0]).toHaveValue(null);
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state for active theses', () => {
      render(<ThesisTracker />);

      expect(screen.getByText('No active theses')).toBeInTheDocument();
      expect(screen.getByText('Create your first investment thesis')).toBeInTheDocument();
    });

    it('shows empty state for monitoring theses', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const monitoringTab = screen.getByText(/Monitoring \(0\)/);
      await user.click(monitoringTab);

      await waitFor(() => {
        expect(screen.getByText('No monitoring theses')).toBeInTheDocument();
      });
    });

    it('shows empty state for validated theses', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const validatedTab = screen.getByText(/Validated \(0\)/);
      await user.click(validatedTab);

      await waitFor(() => {
        expect(screen.getByText('No validated theses')).toBeInTheDocument();
      });
    });

    it('shows empty state for invalidated theses', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const invalidatedTab = screen.getByText(/Invalidated \(0\)/);
      await user.click(invalidatedTab);

      await waitFor(() => {
        expect(screen.getByText('No invalidated theses')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Filtering', () => {
    it('shows active thesis in active tab', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Add active thesis
      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'AI Growth');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'AI will drive growth'
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText(/Active \(1\)/)).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });
    });

    it('shows monitoring thesis in monitoring tab', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Set status to monitoring - click the second combobox (Status)
      const comboboxes = screen.getAllByRole('combobox');
      await user.click(comboboxes[1]);

      const monitoringOption = await screen.findByRole('option', { name: 'Monitoring' });
      await user.click(monitoringOption);

      // Add thesis
      await user.type(screen.getByPlaceholderText('AAPL'), 'GOOGL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'AI Search');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'AI search will improve'
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText(/Monitoring \(1\)/)).toBeInTheDocument();
      });

      const monitoringTab = screen.getByText(/Monitoring \(1\)/);
      await user.click(monitoringTab);

      await waitFor(() => {
        expect(screen.getByText('GOOGL')).toBeInTheDocument();
      });
    });
  });

  describe('Thesis Card Display', () => {
    it('displays thesis details correctly', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'AI Services');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'Apple will monetize AI through services'
      );
      const priceInputs = screen.getAllByPlaceholderText('0.00');
      await user.type(priceInputs[0], '200.00');
      await user.type(priceInputs[1], '150.00');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('AI Services')).toBeInTheDocument();
        expect(screen.getByText('Apple will monetize AI through services')).toBeInTheDocument();
        expect(screen.getByText(/Target: \$200\.00/)).toBeInTheDocument();
        expect(screen.getByText(/Stop: \$150\.00/)).toBeInTheDocument();
      });
    });

    it('shows timeframe badge', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'Test');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'Test hypothesis'
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('medium')).toBeInTheDocument();
      });
    });

    it('shows status badge with correct color', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'Test');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'Test hypothesis'
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        const activeBadge = screen.getByText('active');
        expect(activeBadge).toBeInTheDocument();
        expect(activeBadge).toHaveClass('text-blue-500');
      });
    });

    it('displays key factors as badges', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'Test');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'Test hypothesis'
      );
      await user.type(
        screen.getByPlaceholderText('earnings growth, market share, new product'),
        'AI, cloud, margins'
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('AI')).toBeInTheDocument();
        expect(screen.getByText('cloud')).toBeInTheDocument();
        expect(screen.getByText('margins')).toBeInTheDocument();
      });
    });

    it('shows updated date', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'Test');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'Test hypothesis'
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText(/Updated:/)).toBeInTheDocument();
      });
    });
  });

  describe('Editing Thesis', () => {
    it('populates form with thesis data when edit is clicked', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Add thesis
      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'AI Services');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'AI growth thesis'
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(async () => {
        const editButtons = screen.getAllByRole('button', { name: '' });
        const editButton = editButtons.find((btn) => btn.querySelector('.lucide-edit-2'));
        if (editButton) {
          await user.click(editButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Edit Thesis')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('AAPL')).toHaveValue('AAPL');
      });
    });

    it('shows cancel button when editing', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Add thesis
      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'Test');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'Test hypothesis'
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(async () => {
        const editButtons = screen.getAllByRole('button', { name: '' });
        const editButton = editButtons.find((btn) => btn.querySelector('.lucide-edit-2'));
        if (editButton) {
          await user.click(editButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
      });
    });

    it('cancels edit and resets form', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Add thesis
      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'Test');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'Test hypothesis'
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(async () => {
        const editButtons = screen.getAllByRole('button', { name: '' });
        const editButton = editButtons.find((btn) => btn.querySelector('.lucide-edit-2'));
        if (editButton) {
          await user.click(editButton);
        }
      });

      const cancelButton = await screen.findByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText('New Thesis')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('AAPL')).toHaveValue('');
      });
    });
  });

  describe('Deleting Thesis', () => {
    it('deletes thesis when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      // Add thesis
      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'Test');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'Test hypothesis'
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('1 active')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find((btn) => btn.querySelector('.lucide-trash-2'));

      if (deleteButton) {
        await user.click(deleteButton);
      }

      await waitFor(() => {
        expect(screen.getByText('0 active')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<ThesisTracker />);

      // Check that labels exist in the document
      expect(screen.getByText('Symbol')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Hypothesis')).toBeInTheDocument();
      expect(screen.getByText('Timeframe')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('has required attribute on required inputs', () => {
      render(<ThesisTracker />);

      const symbolInput = screen.getByPlaceholderText('AAPL');
      const titleInput = screen.getByPlaceholderText('Brief thesis title');
      const hypothesisInput = screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...');

      expect(symbolInput).toHaveAttribute('required');
      expect(titleInput).toHaveAttribute('required');
      expect(hypothesisInput).toHaveAttribute('required');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty key factors input', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'Test');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'Test hypothesis'
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        // No key factor badges should be present
        const badges = screen.queryAllByRole('status');
        const keyFactorBadges = badges.filter((b) => !b.textContent?.includes('active'));
        expect(keyFactorBadges.length).toBe(0);
      });
    });

    it('handles very long hypothesis text', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      const longHypothesis = 'A'.repeat(500);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'Test');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        longHypothesis
      );
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });
    });

    it('handles decimal price values', async () => {
      const user = userEvent.setup();
      render(<ThesisTracker />);

      await user.type(screen.getByPlaceholderText('AAPL'), 'AAPL');
      await user.type(screen.getByPlaceholderText('Brief thesis title'), 'Test');
      await user.type(
        screen.getByPlaceholderText('Detailed thesis hypothesis and rationale...'),
        'Test hypothesis'
      );
      const priceInputs = screen.getAllByPlaceholderText('0.00');
      await user.type(priceInputs[0], '199.99');
      await user.type(priceInputs[1], '149.99');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText(/Target: \$199\.99/)).toBeInTheDocument();
        expect(screen.getByText(/Stop: \$149\.99/)).toBeInTheDocument();
      });
    });
  });
});
