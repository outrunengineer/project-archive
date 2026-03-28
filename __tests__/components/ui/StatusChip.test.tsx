import { render, screen } from '@testing-library/react';
import { StatusChip } from '@/components/ui/StatusChip';

describe('StatusChip', () => {
  it('renders the label for positive variant', () => {
    render(<StatusChip variant="positive" label="Positive Impact" />);
    expect(screen.getByText('Positive Impact')).toBeInTheDocument();
  });

  it('renders the label for negative variant', () => {
    render(<StatusChip variant="negative" label="Negative Impact" />);
    expect(screen.getByText('Negative Impact')).toBeInTheDocument();
  });

  it('renders the label for neutral variant', () => {
    render(<StatusChip variant="neutral" label="Neutral" />);
    expect(screen.getByText('Neutral')).toBeInTheDocument();
  });

  it('renders the label for custom variant', () => {
    render(<StatusChip variant="custom" label="Key Decision" />);
    expect(screen.getByText('Key Decision')).toBeInTheDocument();
  });

  it('positive chip contains an upward arrow indicator', () => {
    const { container } = render(<StatusChip variant="positive" label="Good" />);
    expect(container.textContent).toContain('↑');
  });

  it('negative chip contains a downward arrow indicator', () => {
    const { container } = render(<StatusChip variant="negative" label="Bad" />);
    expect(container.textContent).toContain('↓');
  });

  it('neutral chip contains a double arrow indicator', () => {
    const { container } = render(<StatusChip variant="neutral" label="Neutral" />);
    expect(container.textContent).toContain('↕');
  });

  it('custom variant has no automatic arrow', () => {
    const { container } = render(<StatusChip variant="custom" label="Label" />);
    expect(container.textContent).not.toContain('↑');
    expect(container.textContent).not.toContain('↓');
    expect(container.textContent).not.toContain('↕');
  });
});
