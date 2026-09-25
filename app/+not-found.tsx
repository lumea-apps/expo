import { Redirect } from 'expo-router';

// Any unknown path (a stale deep link, or the page URL when the web build is
// hosted under a sub-path) simply lands on the conversation.
export default function NotFoundScreen() {
  return <Redirect href="/" />;
}
