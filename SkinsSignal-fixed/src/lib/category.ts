export function categorize(name: string): string {
  const n = name.toLowerCase();
  const is = (s: string) => n.includes(s);
  if (["knife", "karambit", "bayonet", "m9", "butterfly", "daggers"].some(is)) return "Knives";
  if (["gloves"].some(is)) return "Gloves";
  if (["sticker"].some(is)) return "Stickers";
  if (["case"].some(is)) return "Cases";
  if (["ak-47","ak47","awp","m4a1-s","m4a4","aug","famas","galil","sg 553","scar-20","g3sg1"].some(is)) return "Rifles";
  if (["usp","glock","p2000","p250","cz75","tec-9","deagle","desert eagle","dual berettas","r8","five-seven"].some(is)) return "Pistols";
  return "Others";
}
