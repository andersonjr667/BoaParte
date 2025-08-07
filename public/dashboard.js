// ...adicione este arquivo ao seu frontend, ou adapte para seu framework...

import React, { useEffect, useState } from 'react';

function Dashboard() {
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    fetch('/api/contacts')
      .then(res => res.json())
      .then(setContacts);
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
      .then(res => res.json())
      .then(newContact => {
        setContacts([...contacts, newContact]);
        setShowForm(false);
        setForm({ name: '', phone: '', email: '' });
      });
  }

  return (
    <div>
      <h2>Visitantes</h2>
      <button onClick={() => setShowForm(true)}>Adicionar Contato</button>
      {showForm && (
        <form onSubmit={handleSubmit}>
          <input name="name" placeholder="Nome" value={form.name} onChange={handleChange} required />
          <input name="phone" placeholder="Telefone" value={form.phone} onChange={handleChange} required />
          <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <button type="submit">Salvar</button>
          <button type="button" onClick={() => setShowForm(false)}>Cancelar</button>
        </form>
      )}
      <ul>
        {contacts.map(c => (
          <li key={c._id}>{c.name} - {c.phone} - {c.email}</li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
