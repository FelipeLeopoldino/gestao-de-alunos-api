import request from 'supertest';
import { expect } from 'chai';
import { apiUrl } from '../setup.js';

async function login({ email, senha }, role) {
  const resposta = await request(apiUrl)
    .post('/api/auth/login')
    .send({ email, senha })
    .expect(200);

  expect(resposta.body.token).to.be.a('string').and.not.be.empty;
  expect(resposta.body.usuario.role).to.equal(role);
  expect(resposta.body.usuario).not.to.have.property('senha');

  return resposta;
}

export function loginAdmin(credenciais) {
  return login(credenciais, 'admin');
}

export function loginUsuario(credenciais) {
  return login(credenciais, 'aluno');
}
