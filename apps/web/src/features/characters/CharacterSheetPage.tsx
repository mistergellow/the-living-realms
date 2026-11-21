import { MAX_PREPARED_SKILLS } from '@realms/shared';
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

export function CharacterSheetPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const sheet = useCharacterSheet(id);
  const select = useActiveCharacter((s) => s.select);
  const navigate = useNavigate();
  const tab: TabId = TABS.some((t) => t.id === params.get('tab'))
    ? (params.get('tab') as TabId)
    : 'equipment';

  if (sheet.isPending) return <FullPageMessage>Loading character…</FullPageMessage>;
  if (sheet.isError) return <FullPageMessage spinner={false}>Character not found.</FullPageMessage>;
  const s = sheet.data;
  const prepared = s.loadout.filter(Boolean).length;

  return (
    <Screen>
      <header className="topbar">
        <Link className="btn btn-ghost btn-sm" to="/characters">
          <Icon name="back" />
          Characters
        </Link>
        <div className="sheet-header">
          <CharacterToken appearance={s.character.appearance} size={52} />
          <div>
            <h1 data-testid="sheet-name">{s.character.name}</h1>
            <span className="rep-badge">
              Reputation <strong data-testid="reputation">{s.reputation}</strong>
            </span>
          </div>
        </div>
        <span className="spacer" />
        <button
          className="btn btn-primary"
          onClick={() => {
            select(s.character.id);
            navigate('/home');
          }}
        >
          Play
        </button>
      </header>

      <main className="screen-body">
        <div className="contain sheet">
          <nav className="sheet-tabs" role="tablist" aria-label="Character sheet">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className="sheet-tab"
                onClick={() =>
                  setParams(t.id === 'equipment' ? {} : { tab: t.id }, { replace: true })
                }
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
      </main>
    </Screen>
  );
}
