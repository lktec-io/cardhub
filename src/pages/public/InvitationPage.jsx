import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiCompass } from 'react-icons/fi';
import { InvitationRenderer } from '../../components/invitation/InvitationRenderer';
import { Seo } from '../../components/common';
import { getEventTypeLabel } from '../../constants/eventTypes';
import { publicService } from '../../services/publicService';

function InvitationLoading() {
  return (
    <div className="ch-invite-status">
      <div className="ch-invite-status__mark" aria-hidden="true">
        CardHub
      </div>
      <div className="ch-invite-status__spinner" role="status" aria-label="Loading invitation" />
    </div>
  );
}

function InvitationUnavailable() {
  return (
    <div className="ch-invite-status">
      <FiCompass className="ch-invite-status__icon" aria-hidden="true" />
      <h1 className="ch-h3">Invitation not found</h1>
      <p className="ch-body-sm">This invitation link doesn&rsquo;t exist, or is no longer available.</p>
    </div>
  );
}

export function InvitationPage() {
  const { slug } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isMounted = true;
    publicService
      .getInvitation(slug)
      .then((res) => {
        if (isMounted) {
          setInvitation(res.data.data.invitation);
          setStatus('success');
        }
      })
      .catch(() => {
        if (isMounted) setStatus('unavailable');
      });
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (status === 'loading') {
    return (
      <div className="ch-invite-page">
        <InvitationLoading />
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="ch-invite-page">
        <Seo title="Invitation" description="CardHub digital invitation." />
        <InvitationUnavailable />
      </div>
    );
  }

  const heading = invitation.hostName || invitation.title;
  const seoDescription = `You're invited to ${heading}'s ${getEventTypeLabel(invitation.eventType).toLowerCase()}${
    invitation.venue?.name ? ` at ${invitation.venue.name}` : ''
  }. Created with CardHub.`;

  return (
    <div className="ch-invite-page">
      <Seo title={heading} description={seoDescription} />
      <InvitationRenderer
        event={invitation}
        config={invitation.invitation}
        templateConfig={invitation.template?.config}
        slug={slug}
      />
    </div>
  );
}
