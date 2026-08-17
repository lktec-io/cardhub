import { FiPlus, FiX } from 'react-icons/fi';
import { Input, Textarea, Button } from '../../../../components/ui';
import { MAX_HOSTS, MAX_GALLERY_IMAGES, MAX_MESSAGE_LENGTH, MAX_SUBTITLE_LENGTH } from '../../../../constants/invitationSections';

function ListField({ items, onChange, placeholder, max, addLabel }) {
  function updateAt(index, value) {
    const next = [...items];
    next[index] = value;
    onChange(next);
  }
  function removeAt(index) {
    onChange(items.filter((_, i) => i !== index));
  }
  function add() {
    if (items.length < max) onChange([...items, '']);
  }

  return (
    <div className="ch-builder-list-field">
      {items.map((item, index) => (
        <div className="ch-builder-list-field__row" key={index}>
          <Input value={item} onChange={(e) => updateAt(index, e.target.value)} placeholder={placeholder} />
          <button type="button" className="ch-builder-list-field__remove" onClick={() => removeAt(index)} aria-label="Remove">
            <FiX />
          </button>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <FiPlus aria-hidden="true" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

export function SectionContentEditor({ section, onChange }) {
  function updateData(patch) {
    onChange({ ...section.data, ...patch });
  }

  switch (section.type) {
    case 'hero':
      return (
        <Input
          label="Subtitle"
          value={section.data.subtitle || ''}
          onChange={(e) => updateData({ subtitle: e.target.value })}
          placeholder="invite you to celebrate their wedding"
          hint={`${(section.data.subtitle || '').length}/${MAX_SUBTITLE_LENGTH}`}
        />
      );

    case 'message':
      return (
        <Textarea
          label="Your message"
          value={section.data.message || ''}
          onChange={(e) => updateData({ message: e.target.value })}
          placeholder="Join us as we celebrate..."
          hint={`${(section.data.message || '').length}/${MAX_MESSAGE_LENGTH}`}
        />
      );

    case 'hosts':
      return (
        <div>
          <p className="ch-field__label">Hosts</p>
          <ListField
            items={section.data.hosts || []}
            onChange={(hosts) => updateData({ hosts })}
            placeholder="Host name"
            max={MAX_HOSTS}
            addLabel="Add host"
          />
        </div>
      );

    case 'gallery':
      return (
        <div>
          <p className="ch-field__label">Image URLs</p>
          <ListField
            items={section.data.images || []}
            onChange={(images) => updateData({ images })}
            placeholder="https://example.com/photo.jpg"
            max={MAX_GALLERY_IMAGES}
            addLabel="Add image"
          />
        </div>
      );

    case 'details':
      return <p className="ch-caption">Shows your event date, time, and timezone — edit these in Event Settings.</p>;

    case 'venue':
      return <p className="ch-caption">Shows your venue name and address — edit these in Event Settings.</p>;

    case 'countdown':
      return <p className="ch-caption">Automatically counts down to your event date.</p>;

    case 'rsvp':
      return (
        <p className="ch-caption">
          Lets guests respond directly on your invitation. Responses appear in the Guests tab. Shown as a
          preview here — try it for real on the published invitation.
        </p>
      );

    default:
      return null;
  }
}
