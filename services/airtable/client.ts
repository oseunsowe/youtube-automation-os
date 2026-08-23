export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  fields: T;
}

export class AirtableClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseId: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private tableUrl(table: string, suffix = "") {
    return `https://api.airtable.com/v0/${this.baseId}/${encodeURIComponent(table)}${suffix}`;
  }

  async listRecords<T = Record<string, unknown>>(
    table: string,
    filterByFormula?: string,
  ): Promise<AirtableRecord<T>[]> {
    const url = new URL(this.tableUrl(table));
    if (filterByFormula) url.searchParams.set("filterByFormula", filterByFormula);

    const res = await this.fetchImpl(url.toString(), { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Airtable listRecords failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { records: AirtableRecord<T>[] };
    return data.records;
  }

  async updateRecord<T = Record<string, unknown>>(
    table: string,
    recordId: string,
    fields: Partial<T>,
  ): Promise<void> {
    const res = await this.fetchImpl(this.tableUrl(table, `/${recordId}`), {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) {
      throw new Error(`Airtable updateRecord failed: ${res.status} ${await res.text()}`);
    }
  }

  async createRecord<T = Record<string, unknown>>(table: string, fields: T): Promise<AirtableRecord<T>> {
    const res = await this.fetchImpl(this.tableUrl(table), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) {
      throw new Error(`Airtable createRecord failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as AirtableRecord<T>;
  }
}
