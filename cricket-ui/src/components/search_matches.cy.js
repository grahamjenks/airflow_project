describe('Search Matches Flow', () => {
  beforeEach(() => {
    // Assuming the app is running on port 3000 as defined in vite.config.js
    // and the SearchMatches component is rendered on the homepage.
    // Update the path if it is on a sub-route (e.g., '/search').
    cy.visit('http://localhost:3000');
  });

  it('renders the search interface elements', () => {
    cy.get('.search-matches').should('be.visible');
    cy.get('.search-input').should('be.visible').and('be.enabled');
    cy.get('.search-filters').should('be.visible');
  });

  it('allows the user to type a search query', () => {
    const query = 'T20 World Cup';
    cy.get('.search-input')
      .type(query)
      .should('have.value', query);
  });

  it('displays matches grid or empty state after searching', () => {
    // Type a query to trigger the search flow
    cy.get('.search-input').type('Test Match');

    // Handle potential loading state
    cy.get('body').then(($body) => {
      if ($body.find('.loading-matches').length > 0) {
        cy.get('.loading-matches').should('be.visible');
        cy.get('.loading-matches', { timeout: 10000 }).should('not.exist');
      }
    });

    // Verify that either results are shown or the no-results message is displayed
    cy.get('body').then(($body) => {
      if ($body.find('.matches-grid').length > 0) {
        cy.get('.matches-grid').should('be.visible');
      } else {
        cy.get('.no-results').should('be.visible');
      }
    });
  });

  it('renders filter groups', () => {
    cy.get('.search-filters .filter-group').should('have.length.gt', 0);
  });
});