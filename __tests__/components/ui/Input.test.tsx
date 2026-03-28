import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  it('renders label text above the field', () => {
    render(<Input label="Project Name" id="name" />);
    expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
    expect(screen.getByText('Project Name')).toBeInTheDocument();
  });

  it('applies focused class on focus event', () => {
    render(<Input label="Name" id="name" />);
    const input = screen.getByLabelText('Name');
    expect(input.className).toContain('bg-surface-container-high');
    fireEvent.focus(input);
    expect(input.className).toContain('bg-surface-container-lowest');
  });

  it('reverts to default class on blur', () => {
    render(<Input label="Name" id="name" />);
    const input = screen.getByLabelText('Name');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input.className).toContain('bg-surface-container-high');
  });

  it('renders error text when error prop provided', () => {
    render(<Input label="Name" id="name" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Input label="Name" id="name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });
});
