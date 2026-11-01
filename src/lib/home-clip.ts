/**
 * The clips on Home: one voice, heard before anything else, a different one
 * each visit. Draft picks for the project lead to confirm or replace. Curated
 * by hand rather than queried so Home still renders when the database is down.
 *
 * Rules for a clip (checked against the data when these were chosen):
 * - only the storyteller speaking, under 90 seconds;
 * - from a recording with no content advisory, because this play button has
 *   no pre-playback note, and overlapping no flagged passage;
 * - delight, wit or a vivid scene, not testimony of harm.
 * `quote` is the machine transcript, trimmed and lightly punctuated.
 * `audioUrl` goes through the /audio relay: change it here too when that
 * route is retired.
 */
export type HomeClip = {
  id: string;
  catalogNumber: string;
  title: string;
  storyteller: string;
  detail: string;
  quote: string;
  audioUrl: string;
  start: number;
  end: number;
};

const clip = (
  catalogNumber: string,
  file: string,
  start: number,
  end: number,
  title: string,
  storyteller: string,
  detail: string,
  quote: string,
): HomeClip => ({
  id: `home:${catalogNumber}:${Math.floor(start)}`,
  catalogNumber,
  title,
  storyteller,
  detail,
  quote,
  audioUrl: `/audio/${file}.mp3`,
  start,
  end,
});

export const HOME_CLIPS: readonly HomeClip[] = [
  clip(
    "MSS 637.104.002", "JamesMoore2", 53.6, 85, "On the steam engine", "James Moore",
    "Railroad dining car steward, recorded 1977",
    "The steam engine was the most thrilling… There was a thrill about, something about that steam engine moving off and picking up speed and knocking along.",
  ),
  clip(
    "MSS 637.104.002", "JamesMoore2", 738.5, 812.4, "The passenger who tipped in new pennies", "James Moore",
    "Railroad dining car steward, recorded 1977",
    "I gave you new pennies for every meal you served me… If you have them all, I'll give you $1 for every penny that you have.",
  ),
  clip(
    "MSS 637.117.001", "BlanchePuckett1", 525.1, 550.3, "Dancing at the Ford showroom", "Mattie B. Puckett",
    "Widow of country music pioneer Riley Puckett, recorded 1978",
    "If I had all the shoes I've ever danced out, I'd start me a shoe store.",
  ),
  clip(
    "MSS 637.068.001", "WalterPayne", 122.3, 139.8, "The Titanic on Techwood Drive", "Walter Payne",
    "Techwood neighborhood grocer, recorded 1978",
    "We had one big apartment house on Techwood Drive. It extended for approximately two blocks. It was called the Titanic.",
  ),
  clip(
    "MSS 637.057.001", "ClaraGipson", 1400.2, 1422.8, "Ice cream in the trays", "Clara Gipson",
    "University Homes resident since 1937, recorded 1978",
    "She was making her ice cream in the refrigerator, you know, in the trays… I said, oh boy, I know I like that.",
  ),
  clip(
    "MSS 637.082.001", "LDAndLauraKeith", 1006, 1026.2, "Summerhill was tops", "L.D. and Laura Keith",
    "Longtime Atlanta residents, recorded 1978",
    "If you didn't live in Summerhill, you didn't live in Atlanta, because Summerhill was tops.",
  ),
  clip(
    "MSS 637.021.001", "WilliamHolmesBorders", 1803.8, 1839.2, "The first Black police on Auburn Avenue", "William Holmes Borders",
    "Pastor of Wheat Street Baptist Church, recorded 1978",
    "The first time these Black police came out on the street in their uniforms… Negroes popped up out of the ground.",
  ),
  clip(
    "MSS 637.067.001", "VonceleHeggood", 607.3, 616, "It was home", "Voncele Heggood",
    "Early resident of Clark Howell Homes, recorded 1978",
    "It was grand. We all enjoyed it. I wanted to fix it up. It was home.",
  ),
  clip(
    "MSS 637.058.001", "EffieGray1", 794.8, 834.2, "Terms of a marriage", "Effie Gray",
    "Cabbagetown mill worker, recorded 1978",
    "I said, mind your affairs is our affairs… We go 50/50, because I knew he was a gambler.",
  ),
  clip(
    "MSS 637.097.001", "HughMcDonald1", 1685.9, 1700.2, "Dynamite at the Great Fire", "Hugh McDonald",
    "Atlanta Fire Department driver, recorded 1978",
    "He put that dynamite in the fireplace, and when he get out there and plunge it, man, I'm telling you, you couldn't believe your eyes.",
  ),
];

/** The clip for this visit. */
export function pickHomeClip(random: () => number = Math.random): HomeClip {
  return HOME_CLIPS[Math.floor(random() * HOME_CLIPS.length)];
}
