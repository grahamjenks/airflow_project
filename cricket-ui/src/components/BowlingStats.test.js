import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BowlingStats from './BowlingStats';

describe('BowlingStats Component', () => {
  test('renders the bowling stats container', () => {
    const { container } = render(<BowlingStats />);
    expect(container.querySelector('.bowling-stats')).toBeInTheDocument();
  });

  test('renders the main heading', () => {
    render(<BowlingStats />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
  });

  test('renders the form elements', () => {
    const { container } = render(<BowlingStats />);
    expect(container.querySelector('.bowling-form')).toBeInTheDocument();
    // Check for form groups
    const formGroups = container.querySelectorAll('.form-group');
    expect(formGroups.length).toBeGreaterThan(0);
  });

  test('renders the submit button', () => {
    const { container } = render(<BowlingStats />);
    const button = container.querySelector('.submit-button');
    expect(button).toBeInTheDocument();
  });

  test('renders the stats grid', () => {
    const { container } = render(<BowlingStats />);
    expect(container.querySelector('.stats-grid')).toBeInTheDocument();
  });
});