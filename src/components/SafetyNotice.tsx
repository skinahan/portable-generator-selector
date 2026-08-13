const CPSC_URL =
  'https://www.cpsc.gov/Newsroom/News-Releases/2026/CPSC-Warns-of-Generator-Carbon-Monoxide-and-Fire-Hazards-Ahead-of-Hurricane-Season'

export function SafetyNotice() {
  return (
    <aside className="safety" aria-label="Generator safety">
      <h2 className="safety__heading">Generator safety</h2>
      <p>
        Operate portable generators outdoors only, at least 20 feet from homes
        and buildings, with exhaust directed away from windows, doors, and
        vents. Never operate one inside a home, garage, basement, crawlspace,
        shed, or other enclosed area—even with doors or windows open. Never
        connect a portable generator to a household receptacle to power home
        wiring. Home-wiring connections require appropriate transfer equipment.
        Follow the generator manufacturer&apos;s instructions.
      </p>
      <p className="safety__link">
        <a href={CPSC_URL} target="_blank" rel="noopener noreferrer">
          Generator safety guidance — U.S. CPSC
        </a>
      </p>
    </aside>
  )
}
