import { BrandGlyph } from './Brand';

export default function HeroBanner({ coverPhotoUrl, logoUrl }) {
  return (
    <div className="heroBanner">
      {coverPhotoUrl && <img src={coverPhotoUrl} alt="" />}
      <div className="heroGlyph"><BrandGlyph logoUrl={logoUrl} /></div>
      <div className="heroContent">
        <small>Beyond the Game. Through the Gateway.</small>
        <h2>Fantasy Faggala League</h2>
      </div>
    </div>
  );
}
