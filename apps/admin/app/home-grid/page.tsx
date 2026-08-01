import HomeGridEditor from '../domains/home-grid/HomeGridEditor';

export const metadata = { title: 'Homepage grid' };

export default function HomeGridPage() {
  return (
    <>
      <h1>Homepage grid</h1>
      <p className="muted">
        The five blocks of the bento section on the homepage. The section has exactly these five and no way to add a
        sixth — the column heights (724 = 420 + 280 = 350 + 350) are what keep the three columns ending on the same
        line.
      </p>
      <HomeGridEditor />
    </>
  );
}
