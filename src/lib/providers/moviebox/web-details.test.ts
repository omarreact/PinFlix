import { afterEach, describe, expect, it, vi } from "vitest";
import { getDetails } from "./web";
afterEach(() => vi.unstubAllGlobals());
describe("verified provider filter metadata", () => {
  it("maps actual resolution, audio variants and cast while excluding subtitle languages and directors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          code: 0,
          data: {
            subject: {
              subjectId: "123",
              subjectType: 1,
              title: "Example",
              genre: "Action",
              countryName: "United States",
              subtitles: "Bangla,Hindi",
              dubs: [
                {
                  subjectId: "123",
                  detailPath: "example",
                  lanCode: "en",
                  type: 0,
                  original: true,
                },
                {
                  subjectId: "456",
                  detailPath: "hindi",
                  lanCode: "hi",
                  type: 0,
                  original: false,
                },
                {
                  subjectId: "789",
                  detailPath: "sub",
                  lanCode: "bn",
                  type: 1,
                  original: false,
                },
              ],
            },
            stars: [
              { name: "Actor", staffType: 1 },
              { name: "Director", staffType: 2 },
            ],
            resource: {
              seasons: [
                { resolutions: [{ resolution: 1080 }, { resolution: 2160 }] },
              ],
            },
          },
        }),
      ),
    );
    const item = await getDetails("mb-123~example");
    expect(item?.audioLanguages).toEqual(["en"]);
    expect(item?.audioVersions?.map((version) => version.id)).toEqual([
      "mb-123~example",
      "mb-456~hindi",
    ]);
    expect(item?.country).toBe("United States");
    expect(item?.resolutions).toEqual([1080, 2160]);
    expect(item?.cast?.map((credit) => credit.name)).toEqual(["Actor"]);
  });
});
