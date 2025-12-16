import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  EnhancedTable,
  EnhancedTableHead,
  EnhancedTableHeader,
  EnhancedTableBody,
  EnhancedTableRow,
  EnhancedTableCell,
  formatTableValue,
} from '../EnhancedTable';

describe('EnhancedTable', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(
        <EnhancedTable>
          <tbody>
            <tr>
              <td>Test Content</td>
            </tr>
          </tbody>
        </EnhancedTable>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <EnhancedTable className="custom-class">
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </EnhancedTable>
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('renders with overflow-x-auto', () => {
      const { container } = render(
        <EnhancedTable>
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </EnhancedTable>
      );

      expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument();
    });
  });
});

describe('EnhancedTableHead', () => {
  it('renders children', () => {
    render(
      <table>
        <EnhancedTableHead>
          <tr>
            <th>Header</th>
          </tr>
        </EnhancedTableHead>
      </table>
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('applies sticky positioning', () => {
    const { container } = render(
      <table>
        <EnhancedTableHead>
          <tr>
            <th>Header</th>
          </tr>
        </EnhancedTableHead>
      </table>
    );

    expect(container.querySelector('.sticky')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <table>
        <EnhancedTableHead className="custom-class">
          <tr>
            <th>Header</th>
          </tr>
        </EnhancedTableHead>
      </table>
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('EnhancedTableHeader', () => {
  it('renders children', () => {
    render(
      <table>
        <thead>
          <tr>
            <EnhancedTableHeader>Column Name</EnhancedTableHeader>
          </tr>
        </thead>
      </table>
    );

    expect(screen.getByText('Column Name')).toBeInTheDocument();
  });

  it('aligns left by default', () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <EnhancedTableHeader>Content</EnhancedTableHeader>
          </tr>
        </thead>
      </table>
    );

    expect(container.querySelector('.text-left')).toBeInTheDocument();
  });

  it('aligns center when specified', () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <EnhancedTableHeader align="center">Content</EnhancedTableHeader>
          </tr>
        </thead>
      </table>
    );

    expect(container.querySelector('.text-center')).toBeInTheDocument();
  });

  it('aligns right when specified', () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <EnhancedTableHeader align="right">Content</EnhancedTableHeader>
          </tr>
        </thead>
      </table>
    );

    expect(container.querySelector('.text-right')).toBeInTheDocument();
  });
});

describe('EnhancedTableBody', () => {
  it('renders children', () => {
    render(
      <table>
        <EnhancedTableBody>
          <tr>
            <td>Body Content</td>
          </tr>
        </EnhancedTableBody>
      </table>
    );

    expect(screen.getByText('Body Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <table>
        <EnhancedTableBody className="custom-class">
          <tr>
            <td>Content</td>
          </tr>
        </EnhancedTableBody>
      </table>
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('EnhancedTableRow', () => {
  it('renders children', () => {
    render(
      <table>
        <tbody>
          <EnhancedTableRow>
            <td>Row Content</td>
          </EnhancedTableRow>
        </tbody>
      </table>
    );

    expect(screen.getByText('Row Content')).toBeInTheDocument();
  });

  it('applies highlight styling when highlight prop is true', () => {
    const { container } = render(
      <table>
        <tbody>
          <EnhancedTableRow highlight>
            <td>Highlighted</td>
          </EnhancedTableRow>
        </tbody>
      </table>
    );

    expect(container.querySelector('.bg-primary\\/5')).toBeInTheDocument();
  });

  it('does not apply highlight by default', () => {
    const { container } = render(
      <table>
        <tbody>
          <EnhancedTableRow>
            <td>Normal</td>
          </EnhancedTableRow>
        </tbody>
      </table>
    );

    expect(container.querySelector('.bg-primary\\/5')).not.toBeInTheDocument();
  });
});

describe('EnhancedTableCell', () => {
  it('renders children', () => {
    render(
      <table>
        <tbody>
          <tr>
            <EnhancedTableCell>Cell Content</EnhancedTableCell>
          </tr>
        </tbody>
      </table>
    );

    expect(screen.getByText('Cell Content')).toBeInTheDocument();
  });

  it('aligns left by default', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <EnhancedTableCell>Content</EnhancedTableCell>
          </tr>
        </tbody>
      </table>
    );

    expect(container.querySelector('.text-left')).toBeInTheDocument();
  });

  it('aligns center when specified', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <EnhancedTableCell align="center">Content</EnhancedTableCell>
          </tr>
        </tbody>
      </table>
    );

    expect(container.querySelector('.text-center')).toBeInTheDocument();
  });

  it('aligns right when specified', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <EnhancedTableCell align="right">Content</EnhancedTableCell>
          </tr>
        </tbody>
      </table>
    );

    expect(container.querySelector('.text-right')).toBeInTheDocument();
  });

  it('applies numeric styling', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <EnhancedTableCell numeric>100</EnhancedTableCell>
          </tr>
        </tbody>
      </table>
    );

    expect(container.querySelector('.font-mono')).toBeInTheDocument();
    expect(container.querySelector('.tabular-nums')).toBeInTheDocument();
  });

  it('applies positive styling', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <EnhancedTableCell positive>+10%</EnhancedTableCell>
          </tr>
        </tbody>
      </table>
    );

    expect(container.querySelector('.text-green-500')).toBeInTheDocument();
  });

  it('applies negative styling', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <EnhancedTableCell negative>-10%</EnhancedTableCell>
          </tr>
        </tbody>
      </table>
    );

    expect(container.querySelector('.text-red-500')).toBeInTheDocument();
  });
});

describe('formatTableValue', () => {
  describe('Percentage Values', () => {
    it('detects positive percentage', () => {
      const result = formatTableValue('+5.25%');
      expect(result.isNumeric).toBe(true);
      expect(result.isPositive).toBe(true);
      expect(result.isNegative).toBe(false);
    });

    it('detects negative percentage', () => {
      const result = formatTableValue('-3.5%');
      expect(result.isNumeric).toBe(true);
      expect(result.isNegative).toBe(true);
      expect(result.isPositive).toBe(false);
    });

    it('detects zero percentage', () => {
      const result = formatTableValue('0%');
      expect(result.isNumeric).toBe(true);
      expect(result.isPositive).toBe(false);
      expect(result.isNegative).toBe(false);
    });
  });

  describe('Currency Values', () => {
    it('detects currency with dollar sign', () => {
      const result = formatTableValue('$1,234.56');
      expect(result.isNumeric).toBe(true);
    });

    it('detects plain number', () => {
      const result = formatTableValue('1234');
      expect(result.isNumeric).toBe(true);
    });

    it('detects negative currency', () => {
      const result = formatTableValue('-$100');
      expect(result.isNumeric).toBe(true);
      expect(result.isNegative).toBe(true);
    });
  });

  describe('Plain Numbers', () => {
    it('detects plain positive number', () => {
      const result = formatTableValue('+100');
      expect(result.isNumeric).toBe(true);
      expect(result.isPositive).toBe(true);
    });

    it('detects plain negative number', () => {
      const result = formatTableValue('-100');
      expect(result.isNumeric).toBe(true);
      expect(result.isNegative).toBe(true);
    });

    it('detects decimal number', () => {
      const result = formatTableValue('3.14159');
      expect(result.isNumeric).toBe(true);
    });
  });

  describe('Non-Numeric Values', () => {
    it('returns non-numeric for text', () => {
      const result = formatTableValue('Apple Inc.');
      expect(result.isNumeric).toBe(false);
    });

    it('returns non-numeric for mixed content', () => {
      const result = formatTableValue('AAPL');
      expect(result.isNumeric).toBe(false);
    });

    it('preserves formatted string', () => {
      const result = formatTableValue('Hello World');
      expect(result.formatted).toBe('Hello World');
    });
  });
});
