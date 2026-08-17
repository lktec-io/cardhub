import { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { Switch } from '../../../../components/ui';
import { getSectionMeta } from '../../../../constants/invitationSections';
import { SectionContentEditor } from './SectionContentEditor';

export function BuilderSectionsPanel({ sections, onUpdateSection, onMoveSection }) {
  const [expandedId, setExpandedId] = useState(null);
  const ordered = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="ch-builder-sections">
      {ordered.map((section, index) => {
        const meta = getSectionMeta(section.type);
        const Icon = meta?.icon;
        const isExpanded = expandedId === section.id;
        const isHero = section.type === 'hero';

        return (
          <div key={section.id} className={`ch-builder-section-row ${isExpanded ? 'ch-builder-section-row--expanded' : ''}`}>
            <div className="ch-builder-section-row__header">
              <button
                type="button"
                className="ch-builder-section-row__title"
                onClick={() => setExpandedId(isExpanded ? null : section.id)}
                aria-expanded={isExpanded}
              >
                {Icon && <Icon aria-hidden="true" />}
                <span>{meta?.label || section.type}</span>
                <FiChevronDown className={`ch-builder-section-row__chevron ${isExpanded ? 'ch-builder-section-row__chevron--open' : ''}`} />
              </button>

              <div className="ch-builder-section-row__controls">
                <button
                  type="button"
                  className="ch-builder-section-row__move"
                  disabled={index === 0}
                  onClick={() => onMoveSection(section.id, 'up')}
                  aria-label={`Move ${meta?.label} up`}
                >
                  <FiChevronUp />
                </button>
                <button
                  type="button"
                  className="ch-builder-section-row__move"
                  disabled={index === ordered.length - 1}
                  onClick={() => onMoveSection(section.id, 'down')}
                  aria-label={`Move ${meta?.label} down`}
                >
                  <FiChevronDown />
                </button>
                <Switch
                  checked={section.enabled}
                  disabled={isHero}
                  onChange={(enabled) => onUpdateSection(section.id, { enabled })}
                />
              </div>
            </div>

            {isExpanded && (
              <div className="ch-builder-section-row__body">
                <SectionContentEditor section={section} onChange={(data) => onUpdateSection(section.id, { data })} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
