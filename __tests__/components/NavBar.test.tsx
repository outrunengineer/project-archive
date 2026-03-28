import { render, screen } from '@testing-library/react';
import { NavBar } from '@/components/NavBar';

// next/navigation is mocked by next/jest automatically via __mocks__
// but we need to control usePathname per test
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

import { usePathname } from 'next/navigation';
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

describe('NavBar', () => {
  it('renders the app name "Project Archive"', () => {
    mockUsePathname.mockReturnValue('/projects');
    render(<NavBar />);
    expect(screen.getByText('Project Archive')).toBeInTheDocument();
  });

  it('renders Projects and Timelines tab links', () => {
    mockUsePathname.mockReturnValue('/projects');
    render(<NavBar />);
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Timelines' })).toBeInTheDocument();
  });

  it('Projects tab is active when pathname is /projects', () => {
    mockUsePathname.mockReturnValue('/projects');
    render(<NavBar />);
    const projectsLink = screen.getByRole('link', { name: 'Projects' });
    expect(projectsLink.className).toContain('font-semibold');
  });

  it('Timelines tab is active when pathname is /timelines', () => {
    mockUsePathname.mockReturnValue('/timelines');
    render(<NavBar />);
    const timelinesLink = screen.getByRole('link', { name: 'Timelines' });
    expect(timelinesLink.className).toContain('font-semibold');
  });

  it('Projects tab is not active when pathname is /timelines', () => {
    mockUsePathname.mockReturnValue('/timelines');
    render(<NavBar />);
    const projectsLink = screen.getByRole('link', { name: 'Projects' });
    expect(projectsLink.className).not.toContain('font-semibold');
  });

  it('"Project Timeline" tab is absent on non-view routes', () => {
    mockUsePathname.mockReturnValue('/projects');
    render(<NavBar />);
    expect(screen.queryByRole('link', { name: 'Project Timeline' })).not.toBeInTheDocument();
  });

  it('"Project Timeline" tab is present on the /view route', () => {
    mockUsePathname.mockReturnValue('/timelines/42/view');
    render(<NavBar />);
    expect(screen.getByRole('link', { name: 'Project Timeline' })).toBeInTheDocument();
  });

  it('renders the global search bar placeholder', () => {
    mockUsePathname.mockReturnValue('/projects');
    render(<NavBar />);
    expect(screen.getByPlaceholderText('Search Project Entities...')).toBeInTheDocument();
  });
});
