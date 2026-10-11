import { Disclaimer } from '../components/Disclaimer';
import { ProfileForm } from '../components/ProfileForm';
import { Card } from '../components/ui';
import { dayKeyInTz } from '../lib/tz';
import { getData, patchLogs, saveProfile } from '../lib/store';
import { startPeriod } from '../lib/periods';

export default function Onboarding() {
  return (
    <main className="mx-auto min-h-dvh max-w-xl px-4 pb-10 pt-8">
      <header className="mb-5 text-center">
        <div className="mx-auto mb-3 grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-lav to-rose text-3xl" aria-hidden="true">
          🌙
        </div>
        <h1 className="text-3xl font-extrabold">Maanfase Cyclus</h1>
        <p className="mt-2 text-muted">Houd je menstruatie en ovulatie bij en zie je persoonlijke maanfase-dagen (methode Jonas) in één kalender.</p>
      </header>
      <Card className="mb-4">
        <h2 className="mb-1 text-lg font-bold">Jouw gegevens</h2>
        <p className="mb-4 text-sm text-muted">Je geboortemoment bepaalt je persoonlijke maanfase: de hoek tussen zon en maan op het moment van je geboorte. Alles blijft op dit apparaat; je hebt geen account nodig.</p>
        <ProfileForm
          initial={null}
          askLastPeriod
          submitLabel="Starten"
          onSubmit={({ profile, lastPeriodStart }) => {
            saveProfile(profile);
            if (lastPeriodStart) {
              const today = dayKeyInTz(new Date(), getData().settings.tz);
              patchLogs(startPeriod(getData().logs, lastPeriodStart, today, profile.periodLength));
            }
          }}
        />
      </Card>
      <Disclaimer />
    </main>
  );
}
