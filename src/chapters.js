const chapters = [
  {
    id: 'library', label: 'The library', companion: 'smiling',
    description: 'Lisa looks into the camera, red braids over her shoulder and library shelves behind her.',
    duration: 15, length: 1.35, ratio: 9 / 16,
    captions: [
      { at: 0, title: 'Becoming', emphasis: 'Lisa.', detail: 'The pages, the people, and the little moments that led to graduation day.' },
      { at: 5.6, title: 'It starts', emphasis: 'with her.', detail: 'A familiar face between the library shelves.' },
      { at: 11, title: 'Behind', emphasis: 'the moment.', detail: 'There’s a whole notebook of days like this.' },
    ],
  },
  {
    id: 'notes', label: 'The notebook', companion: 'reading',
    description: 'An open notebook fills the frame before the camera lifts to the greenery outside.',
    duration: 14.56, length: 1.35, ratio: 5 / 9,
    captions: [
      { at: 0, title: 'In the', emphasis: 'margins.', detail: 'A pen, an open notebook, a desk by the window.' },
      { at: 5.4, title: 'Follow', emphasis: 'the ink.', detail: 'Handwritten lines fill the page.' },
      { at: 9.1, title: 'A little', emphasis: 'perspective.', detail: 'The camera lifts. There’s a world outside the window.' },
    ],
  },
  {
    id: 'writing', label: 'The work',
    description: 'Lisa works through her notes with a red pen and lifts the sheets she has filled.',
    duration: 34.82, length: 2.35, ratio: 5 / 9,
    captions: [
      { at: 0, title: 'In her own', emphasis: 'hand.', detail: 'Sleeves down, red pen out. Back to the page.' },
      { at: 6.1, title: 'Another', emphasis: 'page.', detail: 'She lifts the sheet and finds her place.' },
      { at: 15.8, title: 'Word', emphasis: 'by word.', detail: 'The quiet work that belongs to her.' },
      { at: 27.4, title: 'Look how', emphasis: 'far.', detail: 'All those lines, all those days.' },
    ],
  },
  {
    id: 'friends', label: 'Together',
    description: 'Friends reach into a circle, then slips of paper fall to the pavement between them.',
    duration: 9.92, length: 1.15, ratio: 5 / 9,
    captions: [
      { at: 0, title: 'Room for', emphasis: 'everyone.', detail: 'At the edge of the frame, her friends lean in.' },
      { at: 3.65, title: 'Hands', emphasis: 'in.', detail: 'For a moment, everyone meets in the middle.' },
      { at: 5.9, title: 'Let', emphasis: 'go.', detail: 'The papers fall. The people stay.' },
    ],
  },
];

let offset = 0;
export const timeline = chapters.map((chapter) => {
  const start = offset;
  offset += chapter.length;
  return { ...chapter, start, end: offset };
});
export const timelineLength = offset;
export const mediaPath = (name) => `${import.meta.env.BASE_URL}media/${name}`;
