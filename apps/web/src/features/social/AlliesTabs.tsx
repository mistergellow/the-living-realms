import { NavLink } from 'react-router';

/** Friends and Guild live together under "Allies" (request #69). */
export function AlliesTabs() {
  return (
    <nav className="page-tabs" aria-label="Allies">
      <NavLink to="/friends" className="page-tab" data-testid="friends-tab">
        Friends
      </NavLink>
      <NavLink to="/guild" className="page-tab" data-testid="guild-link">
        Guild
      </NavLink>
    </nav>
  );
}
