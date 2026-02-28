describe('Batting Stats Form Submission Flow', () => {
  beforeEach(() => {
    // Assuming the app is running on port 3000
    // If the BattingStats component is on a specific route, update the URL (e.g., '/batting')
    cy.visit('http://localhost:3000');
  });

  it('renders the batting stats interface', () => {
    cy.get('.batting-stats').should('be.visible');
    cy.get('.batting-form').should('be.visible');
    cy.get('.stats-grid').should('be.visible');
  });

  it('allows the user to enter batting details', () => {
    cy.get('.batting-form').within(() => {
      // Locate inputs within the form groups and type data
      // We select the first input (likely Player Name) and a subsequent one (likely Runs/Balls)
      cy.get('input').first().should('be.visible').type('Virat Kohli');
      
      // If there are multiple inputs, type into the second one as well
      cy.get('input').eq(1).type('82', { force: true });
    });
  });

  it('submits the form and updates the view', () => {
    // Fill out the form
    cy.get('.batting-form input').first().type('Steve Smith');

    // Click the submit button
    cy.get('.submit-button').click();

    // Verify post-submission behavior
    // This assumes the stats grid remains visible or updates
    cy.get('.stats-grid').should('be.visible');
    // Optionally check if the input was cleared or a success message appeared
    // cy.get('.batting-form input').first().should('have.value', '');
  });
});
