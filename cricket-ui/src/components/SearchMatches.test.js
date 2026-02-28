import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchMatches from './SearchMatches';

describe('SearchMatches Component', () => {
  test('renders the search matches container', () => {
    const { container } = render(<SearchMatches />);
    expect(container.querySelector('.search-matches')).toBeInTheDocument();
  });

  test('renders the search input', () => {
    const { container } = render(<SearchMatches />);
    expect(container.querySelector('.search-input')).toBeInTheDocument();
  });

  test('renders search filters', () => {
    const { container } = render(<SearchMatches />);
    expect(container.querySelector('.search-filters')).toBeInTheDocument();
    // Check for filter groups
    const filterGroups = container.querySelectorAll('.filter-group');
    expect(filterGroups.length).toBeGreaterThan(0);
  });

  test('renders matches grid or empty state', () => {
    const { container } = render(<SearchMatches />);
    const hasGrid = container.querySelector('.matches-grid');
    const hasNoResults = container.querySelector('.no-results');
    const hasLoading = container.querySelector('.loading-matches');
    
    // Expect at least one of the main states to be present
    expect(hasGrid || hasNoResults || hasLoading).toBeTruthy();
  });
});