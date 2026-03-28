import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders primary variant without throwing', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders secondary variant without throwing', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
  });

  it('renders tertiary variant without throwing', () => {
    render(<Button variant="tertiary">Tertiary</Button>);
    expect(screen.getByRole('button', { name: 'Tertiary' })).toBeInTheDocument();
  });

  it('primary button has a gradient background style', () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole('button', { name: 'Primary' });
    expect(btn).toHaveStyle({ background: 'linear-gradient(135deg, #000000, #648d78)' });
  });

  it('disabled button does not call onClick', () => {
    const onClick = jest.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('enabled button calls onClick', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Active</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Active' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled button has opacity-50 and cursor-not-allowed classes', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect(btn.className).toContain('opacity-50');
    expect(btn.className).toContain('cursor-not-allowed');
  });
});
