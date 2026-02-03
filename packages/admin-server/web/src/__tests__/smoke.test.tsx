import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('UI smoke', () => {
  it('renders the public home screen shell', () => {
    render(<App />);

    expect(screen.getByText('co-code')).toBeInTheDocument();
    expect(
      screen.getByText('Self layer for autonomous agents')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Give your agent a self\./i })
    ).toBeInTheDocument();
  });
});
