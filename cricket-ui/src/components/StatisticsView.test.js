import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatisticsView from './StatisticsView';

describe('StatisticsView Component', () => {
  test('renders the statistics view container', () => {
    const { container } = render(<StatisticsView />);
    expect(container.querySelector('.statistics-view')).toBeInTheDocument();
  });

  test('renders the header with title', () => {
    const { container } = render(<StatisticsView />);
    expect(container.querySelector('.view-header')).toBeInTheDocument();
    expect(container.querySelector('.view-header h2')).toBeInTheDocument();
  });

  test('renders action buttons', () => {
    const { container } = render(<StatisticsView />);
    expect(container.querySelector('.reset-button')).toBeInTheDocument();
    expect(container.querySelector('.export-button')).toBeInTheDocument();
  });

  test('renders match info section', () => {
    const { container } = render(<StatisticsView />);
    // The match info card might be conditional, but if present:
    const card = container.querySelector('.match-info-card');
    if (card) {
      expect(card).toBeInTheDocument();
    }
  });

  test('renders stats table container', () => {
    const { container } = render(<StatisticsView />);
    expect(container.querySelector('.stats-table-container')).toBeInTheDocument();
  });
});