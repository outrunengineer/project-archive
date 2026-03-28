import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/Sidebar';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(() => ({ id: '1' })),
}));

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

describe('Sidebar', () => {
  it('renders in collapsed state by default (aria-expanded false)', () => {
    render(<Sidebar />);
    expect(screen.getByRole('complementary')).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking the toggle button expands the sidebar', () => {
    render(<Sidebar />);
    const toggle = screen.getByRole('button', { name: 'Expand sidebar' });
    fireEvent.click(toggle);
    expect(screen.getByRole('complementary')).toHaveAttribute('aria-expanded', 'true');
  });

  it('clicking toggle again collapses the sidebar', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.getByRole('complementary')).toHaveAttribute('aria-expanded', 'false');
  });

  it('download button is present with an accessible label', () => {
    render(<Sidebar />);
    expect(
      screen.getByRole('button', { name: 'Download timeline export' }),
    ).toBeInTheDocument();
  });
});
