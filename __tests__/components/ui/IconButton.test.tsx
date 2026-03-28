import { render, screen, fireEvent } from '@testing-library/react';
import { IconButton } from '@/components/ui/IconButton';

const TestIcon = () => <svg data-testid="icon" />;

describe('IconButton', () => {
  it('renders with an accessible aria-label', () => {
    render(<IconButton icon={<TestIcon />} label="Delete item" />);
    const btn = screen.getByRole('button', { name: 'Delete item' });
    expect(btn).toHaveAttribute('aria-label', 'Delete item');
  });

  it('fires onClick when clicked', () => {
    const onClick = jest.fn();
    render(<IconButton icon={<TestIcon />} label="Save" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the icon child', () => {
    render(<IconButton icon={<TestIcon />} label="Icon btn" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('ghost variant applies correct class', () => {
    render(<IconButton icon={<TestIcon />} label="Ghost" variant="ghost" />);
    expect(screen.getByRole('button', { name: 'Ghost' }).className).toContain(
      'hover:bg-surface-container-high',
    );
  });

  it('filled variant applies correct class', () => {
    render(<IconButton icon={<TestIcon />} label="Filled" variant="filled" />);
    expect(screen.getByRole('button', { name: 'Filled' }).className).toContain(
      'bg-surface-container-high',
    );
  });
});
