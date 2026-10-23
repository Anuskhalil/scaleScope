import {useEffect, useState} from 'react';
import {getSignedAvatarUrl} from '../utils/avatarStorage';

export default function ProfileAvatar({value, name, className = ''}) {
  const [image, setImage] = useState(null);
  useEffect(() => {
    let active = true;
    getSignedAvatarUrl(value).then(url => {
      if (active) setImage({value, url});
    }).catch(() => { if (active) setImage(null); });
    return () => { active = false; };
  }, [value]);
  const url = image?.value === value ? image.url : null;
  return <div className={`overflow-hidden flex items-center justify-center shrink-0 ${className}`}>
    {url ? <img src={url} alt={name || 'Profile'} className="w-full h-full object-cover" onError={() => setImage(null)} />
      : <span aria-label={name || 'Profile'}>{(name || '?').split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()}</span>}
  </div>;
}
