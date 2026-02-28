import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MatchDetails from './MatchDetails';

describe('MatchDetails Component', () => {
  test('renders the match details container', () => {
    const { container } = render(<MatchDetails />);
    expect(container.querySelector('.match-details')).toBeInTheDocument();
  });

  test('renders the main heading', () => {
    render(<MatchDetails />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
  });

  test('renders the match form', () => {
    const { container } = render(<MatchDetails />);
    expect(container.querySelector('.match-form')).toBeInTheDocument();
    const formGroups = container.querySelectorAll('.form-group');
    expect(formGroups.length).toBeGreaterThan(0);
  });

  test('renders the submit button', () => {
    const { container } = render(<MatchDetails />);
    expect(container.querySelector('.submit-button')).toBeInTheDocument();
  });
});