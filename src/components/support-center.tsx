"use client";

import { useState, type FormEvent } from "react";

export function SupportCenter() {
  const [ticketOpen, setTicketOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setTicketOpen(false);
  }

  return (
    <>
      <div className="support-toolbar"><button type="button" className="support-primary-action" onClick={() => { setSubmitted(false); setTicketOpen(true); }}><span aria-hidden="true">+</span> New ticket</button></div>
      <div className="support-tabs" role="tablist" aria-label="Support ticket status">
        {['All (0)', 'Open (0)', 'In progress (0)', 'Answered (0)', 'Resolved (0)', 'Closed (0)'].map((tab, index) => <button key={tab} type="button" role="tab" aria-selected={index === 0} className={index === 0 ? "active" : ""}>{tab}</button>)}
      </div>
      <section className="support-empty">
        <div className="support-empty-icon"><span aria-hidden="true">...</span></div>
        <h2>{submitted ? "Your ticket is ready" : "No support tickets yet"}</h2>
        <p>{submitted ? "Our support team will review your request and reply by email." : "Have a question? Create a ticket and our team will help you."}</p>
        {!submitted && <button type="button" className="support-primary-action" onClick={() => setTicketOpen(true)}>+ Create your first ticket</button>}
      </section>
      {ticketOpen && <div className="support-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setTicketOpen(false); }}><form className="support-modal" onSubmit={submitTicket}><div className="flex items-start justify-between gap-4"><div><p className="profile-kicker">Support center</p><h2>Create a ticket</h2></div><button type="button" className="support-close" aria-label="Close" onClick={() => setTicketOpen(false)}>×</button></div><label>Subject<input name="subject" required placeholder="What can we help with?" /></label><label>Message<textarea name="message" required rows={5} placeholder="Describe your question or issue" /></label><button type="submit" className="support-primary-action">Send ticket</button></form></div>}
    </>
  );
}