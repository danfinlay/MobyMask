export default function linkForInvitation(invitation) {
  return window.location.origin + "/#/members?invitation=" + encodeURIComponent(JSON.stringify(invitation));
}
