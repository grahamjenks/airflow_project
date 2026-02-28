import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BattingStats from './BattingStats';

describe('BattingStats Component', () => {
  test('renders the batting stats container', () => {
    const { container } = render(<BattingStats />);
    expect(container.querySelector('.batting-stats')).toBeInTheDocument();
  });

  test('renders the main heading', () => {
    render(<BattingStats />);
    // Assuming the component renders an h2 as styled by .batting-stats h2
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
  });

  test('renders the form elements', () => {
    const { container } = render(<BattingStats />);
    expect(container.querySelector('.batting-form')).toBeInTheDocument();
    // Check for form groups
    const formGroups = container.querySelectorAll('.form-group');
    expect(formGroups.length).toBeGreaterThan(0);
  });

  test('renders the submit button', () => {
    const { container } = render(<BattingStats />);
    const button = container.querySelector('.submit-button');
    expect(button).toBeInTheDocument();
  });

  test('renders the stats grid', () => {
    const { container } = render(<BattingStats />);
    expect(container.querySelector('.stats-grid')).toBeInTheDocument();
  });
});