import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from '@/components/ui/Textarea';

describe('Textarea', () => {
  it('renders with a label', () => {
    render(<Textarea label="Description" id="desc" />);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('respects the rows prop', () => {
    render(<Textarea label="Description" id="desc" rows={5} />);
    expect(screen.getByLabelText('Description')).toHaveAttribute('rows', '5');
  });

  it('defaults to 3 rows when rows prop is omitted', () => {
    render(<Textarea label="Description" id="desc" />);
    expect(screen.getByLabelText('Description')).toHaveAttribute('rows', '3');
  });

  it('applies focused class on focus event', () => {
    render(<Textarea label="Description" id="desc" />);
    const ta = screen.getByLabelText('Description');
    fireEvent.focus(ta);
    expect(ta.className).toContain('bg-surface-container-lowest');
  });

  it('renders error text when error prop provided', () => {
    render(<Textarea label="Description" id="desc" error="Too long" />);
    expect(screen.getByText('Too long')).toBeInTheDocument();
  });
});
