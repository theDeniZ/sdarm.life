import HomeGridEditor from '../domains/home-grid/HomeGridEditor';

export const metadata = { title: 'Homepage grid' };

export default function HomeGridPage() {
  return (
    <>
      <div className="page-header">
        <h1>Homepage grid</h1>
      </div>
      <p className="muted page-lead">
        The six blocks of the bento section on the homepage, each in a fixed slot. There is no way to add or move one —
        the column heights (724 = 350 + 350 = 420 + 280 = 350 + 350) are what keep the three columns ending on the same
        line.
      </p>
      <HomeGridEditor />
    </>
  );
}
