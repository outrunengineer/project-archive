import { render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card body content</Card>);
    expect(screen.getByText('Card body content')).toBeInTheDocument();
  });

  it('renders the header slot when provided', () => {
    render(<Card header="My Card Header">Body</Card>);
    expect(screen.getByText('My Card Header')).toBeInTheDocument();
  });

  it('does not render a header element when header prop is omitted', () => {
    render(<Card>Body only</Card>);
    expect(screen.queryByText('My Card Header')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="extra-class">Body</Card>);
    expect(container.firstChild).toHaveClass('extra-class');
  });
});
