import { MAX_PREPARED_SKILLS, type CharacterSheetDto } from '@realms/shared';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { FullPageMessage } from '../../shared/ui/FullPageMessage';
import { Icon } from '../../shared/ui/Icon';
import { Screen } from '../../shared/ui/Screen';
import { ProfessionsPanel } from '../professions/ProfessionsPage';
import { useActiveCharacter } from './active-character';
import { useCharacterSheet } from './api';
import { CharacterToken } from './CharacterToken';
import { AbilitiesTab } from './sheet/AbilitiesTab';
import { EquipmentTab } from './sheet/EquipmentTab';
import './sheet/sheet.css';

/*
 * Character sheet (request #39): three tabs — Equipment (paper doll, bag with
 * drag and drop, stats), Abilities (prepared skills, library, weapon
 * abilities) and Professions. The tab lives in the URL (?tab=…).
 */
const TABS = [
  { id: 'equipment', label: 'Equipment' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'professions', label: 'Professions' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** The sheet of any character of the account (from the character list): its own screen. */
export function CharacterSheetPage() {
  const { id = '' } = useParams();
  const sheet = useCharacterSheet(id);
  const select = useActiveCharacter((s) => s.select);
  const activeId = useActiveCharacter((s) => s.characterId);
  const navigate = useNavigate();

  if (sheet.isPending) return <FullPageMessage>Loading character…</FullPageMessage>;
  if (sheet.isError) return <FullPageMessage spinner={false}>Character not found.</FullPageMessage>;
  const s = sheet.data;

  return (
    <Screen>
      <header className="topbar">
        <Link className="btn btn-ghost btn-sm" to={activeId ? '/home' : '/characters'}>
          <Icon name="back" />
          Back
        </Link>
        <SheetHeading sheet={s} />
        <span className="spacer" />
        {activeId !== s.character.id && (
          <button
            className="btn btn-primary"
            onClick={() => {
              select(s.character.id);
              navigate('/home');
            }}
          >
            Play
          </button>
        )}
      </header>
      <main className="screen-body">
        <SheetTabs sheet={s} characterId={id} />
      </main>
    </Screen>
  );
}

/**
 * Request #70: the hero you are playing, inside the game frame (same top bar
 * and navigation as every other place), so opening it does not swap the
 * whole screen.
 */
export function HeroPage() {
  const id = useActiveCharacter((s) => s.characterId) ?? '';
  const sheet = useCharacterSheet(id);
  if (!sheet.data) return <div className="screen-body" aria-busy="true" />;
  return (
    <div className="screen-body">
      <SheetTabs sheet={sheet.data} characterId={id} heading />
    </div>
  );
}

function SheetHeading({ sheet: s }: { sheet: CharacterSheetDto }) {
  return (
    <div className="sheet-header">
      <CharacterToken appearance={s.character.appearance} size={52} />
      <div>
        <h1 data-testid="sheet-name">{s.character.name}</h1>
        <span className="rep-badge">
          Reputation <strong data-testid="reputation">{s.reputation}</strong>
          {s.reputationBonusPct > 0 && (
            <span
              className="muted"
              title="Better equipped gear (bonus effects, upgrades) gives more reputation"
              data-testid="reputation-bonus"
            >
              {' '}
              · gear +{s.reputationBonusPct}%
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function SheetTabs({
  sheet: s,
  characterId: id,
  heading = false,
}: {
  sheet: CharacterSheetDto;
  characterId: string;
  heading?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const tab: TabId = TABS.some((t) => t.id === params.get('tab'))
    ? (params.get('tab') as TabId)
    : 'equipment';
  const prepared = s.loadout.filter(Boolean).length;
  return (
    <div className="contain sheet">
      <nav className="sheet-tabs" role="tablist" aria-label="Character sheet">
        {heading && <SheetHeading sheet={s} />}
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className="sheet-tab"
            onClick={() => setParams(t.id === 'equipment' ? {} : { tab: t.id }, { replace: true })}
          >
            {t.label}
            {t.id === 'abilities' && (
              <span className="tab-count">
                {prepared}/{MAX_PREPARED_SKILLS}
              </span>
            )}
            {t.id === 'equipment' && s.attributePoints > 0 && (
              <span className="tab-count" data-alert>
                +{s.attributePoints}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div role="tabpanel">
        {tab === 'equipment' && <EquipmentTab sheet={s} characterId={id} />}
        {tab === 'abilities' && <AbilitiesTab sheet={s} characterId={id} />}
        {tab === 'professions' && <ProfessionsPanel characterId={id} />}
      </div>
    </div>
  );
}
