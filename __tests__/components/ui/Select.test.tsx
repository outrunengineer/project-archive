import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '@/components/ui/Select';

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

describe('Select', () => {
  it('renders a label', () => {
    render(<Select label="Status" id="status" options={OPTIONS} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select label="Status" id="status" options={OPTIONS} />);
    expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Option C' })).toBeInTheDocument();
  });

  it('renders a placeholder option when provided', () => {
    render(<Select label="Status" id="status" options={OPTIONS} placeholder="Pick one" />);
    expect(screen.getByRole('option', { name: 'Pick one' })).toBeInTheDocument();
  });

  it('calls onChange with the selected value', () => {
    const onChange = jest.fn();
    render(<Select label="Status" id="status" options={OPTIONS} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('renders error text when error prop is provided', () => {
    render(<Select label="Status" id="status" options={OPTIONS} error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
