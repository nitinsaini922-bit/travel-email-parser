export interface SampleEmail {
  id: string;
  label: string;
  tag: string;
  body: string;
}

export const SAMPLE_EMAILS: SampleEmail[] = [
  {
    id: "honeymoon",
    label: "Honeymoon, detailed",
    tag: "Rich",
    body: `Subject: Honeymoon in Japan — quote please

Hi Priya,

We finally set a date! My fiancée and I get married on the 3rd of April and we'd love to fly out for our honeymoon shortly after. We're thinking 12 April to 26 April, flying from San Francisco. Dates are a little flexible, give or take 3 days either side.

The plan is Tokyo first (about 5 nights), then Kyoto for 4 nights, and if it isn't mad we'd love 3 nights in Sapporo at the end. We'd both really like a ryokan for at least part of the trip — ideally one with a private onsen and an ocean view.

Budget is around $14,000 total, not including shopping. We'd like premium economy on the way out and business class coming home if that's doable — we have MileagePlus miles to burn. Non-stop flights only please, my wife hates connections. Aisle seats for both of us.

I'm vegetarian and she's gluten-free, so restaurants that can handle that would be a huge help. We're very keen on food tours, a cooking class, and some hiking. Absolutely no group coach tours.

Could you come back to us this week? We're trying to lock things in.

Best regards,
Daniel Okafor
daniel.okafor@gmail.com
+1 415 555 0184`,
  },
  {
    id: "family",
    label: "Family, half-formed",
    tag: "Messy",
    body: `Subject: summer thing

hey — quick one. thinking about somewhere warm with the kids over the summer, probably 10 days. 2 adults 3 children ages 4, 7 and 11. we're in Manchester.

somewhere with a decent pool and a kids club would be ideal, all-inclusive if possible because feeding this lot à la carte is painful. beachfront would be lovely. one of the kids has a nut allergy so the resort needs to take that seriously.

budget maybe 6-7k for the whole thing? we're not fussy about the airline but please no 5am departures.

no rush on this, just starting to look.

cheers
Tom`,
  },
  {
    id: "business",
    label: "Business, urgent",
    tag: "Urgent",
    body: `Subject: URGENT — travel for the Singapore summit

Marta,

I need flights out of Boston to Singapore for the partner summit. I have to be on the ground by the morning of 14 October and I fly home on the 18th. This is time-sensitive — can you get me options today?

Business class, please, and I'd rather not fly through Dubai. Emirates is out. Singapore Airlines or Cathay Pacific preferred. Red-eye is fine, I'd actually prefer it. One checked bag.

Hotel needs to be walking distance to Marina Bay Sands, four star or better, with a proper work desk and a club lounge. I'm Marriott Bonvoy Platinum so Bonvoy properties first. Airport transfer both ways please.

Charge it to the Halloway Partners account.

Thanks,
Alan Reeves
a.reeves@halloway.com`,
  },
  {
    id: "vague",
    label: "Vague enquiry",
    tag: "Sparse",
    body: `Subject: (no subject)

Hi there,

A friend recommended you. We're thinking about doing something in Europe next year, maybe two weeks. Nothing booked yet, still very much at the daydreaming stage.

What sort of thing do you normally put together?

Thanks
Sarah`,
  },
  {
    id: "group",
    label: "Group, multi-city",
    tag: "Group",
    body: `Subject: Safari + beach for 8 of us

Hello,

We're a group of 8 adults (four couples) hoping to do Kenya and Zanzibar back to back next June. Rough plan: fly from London on 6 June, six nights on safari in the Masai Mara, then a week in Zanzibar, home around the 20th.

We'd like 4 rooms, mid-range to nice — think a good tented camp rather than the £2,000-a-night places. Budget is roughly £4,500 per person all in.

Two of the group are keen on scuba, and one has limited mobility so step-free access at the beach hotel is important. We'd also want a private driver for the Nairobi legs.

It's for a 40th birthday so we'd love something a bit special one evening.

Kind regards,
Nadia Bell
nadia.bell@outlook.com`,
  },
];

export const DEFAULT_SAMPLE = SAMPLE_EMAILS[0];
