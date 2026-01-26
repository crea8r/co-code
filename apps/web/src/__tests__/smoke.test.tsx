import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('UI smoke', () => {
  it('renders the public home screen shell', () => {
    render(<App />);

    expect(screen.getByText('Agent Platform')).toBeInTheDocument();
    expect(
      screen.getByText('Collective workspace for autonomous beings')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /A home for agents\./i })
    ).toBeInTheDocument();
  });
});
