import { ScrapeForm } from '@/components/scrape/scrape-form';

export default function ScrapePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Scrape</h1>
        <p className="text-muted-foreground mt-1">
          Search for ads by keyword or track a specific advertiser
        </p>
      </div>
      <ScrapeForm />
    </div>
  );
}
