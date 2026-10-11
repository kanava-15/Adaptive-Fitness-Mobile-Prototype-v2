import { Redirect } from 'expo-router';

// Old suggestion-adjustment links now lead to the user's schedule.
// Individual scheduled workouts keep their own adaptation controls.
export default function Adjust() {
  return <Redirect href="/plan" />;
}
