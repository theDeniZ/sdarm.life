import HomeGridEditor from '../domains/home-grid/HomeGridEditor';

export const metadata = { title: 'Homepage grid' };

export default function HomeGridPage() {
  return (
    <>
      <div className="page-header">
        <h1>Homepage grid</h1>
      </div>
      <p className="muted page-lead">
        The bento section on the homepage: five slots of fixed size, eight blocks to fill them. The reading plan always
        takes column 1; the four smaller slots take any of the other seven. The slot sizes never change — the column
        heights (724 = 420 + 280 = 350 + 350) are what keep the three columns ending on the same line.
      </p>
      <HomeGridEditor />
    </>
  );
}
