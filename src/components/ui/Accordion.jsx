import { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

export function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="ch-accordion">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div className="ch-accordion__item" key={item.question}>
            <button
              type="button"
              className="ch-accordion__trigger"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span>{item.question}</span>
              <FiChevronDown className={`ch-accordion__chevron ${isOpen ? 'ch-accordion__chevron--open' : ''}`} aria-hidden="true" />
            </button>
            {isOpen && <div className="ch-accordion__panel ch-animate-slide-down">{item.answer}</div>}
          </div>
        );
      })}
    </div>
  );
}
