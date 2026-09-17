import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { expect } from 'chai';
import { apiUrl } from './setup.js';
import { loginAdmin, loginUsuario } from './helpers/auth.helper.js';

const dados = JSON.parse(readFileSync(new URL('./data/cenarios.json', import.meta.url), 'utf8'));

describe('Fluxo de cadastro, login e entrega de trabalho', () => {
  for (const cenario of dados.entregas) {
    it(`deve concluir o fluxo: ${cenario.nome}`, async () => {
      // Evita conflitos de e-mail e matrícula em execuções repetidas.
      const sufixo = randomUUID();
      const dadosAluno = {
        ...cenario.aluno,
        email: cenario.aluno.email.replace('@', `+${sufixo}@`),
        matricula: `${cenario.aluno.matricula}-${sufixo}`,
      };
      const admin = await loginAdmin(dados.admin);

      const cadastro = await request(apiUrl)
        .post('/api/admin/alunos')
        .auth(admin.body.token, { type: 'bearer' })
        .send(dadosAluno)
        .expect(201);
      const { id: alunoId } = cadastro.body;
      expect(alunoId).to.be.a('string').and.not.be.empty;
      expect(cadastro.body).to.include({
        nome: dadosAluno.nome,
        email: dadosAluno.email,
        matricula: dadosAluno.matricula,
        role: 'aluno',
      });
      expect(cadastro.body).not.to.have.property('senha');

      // A matrícula é um pré-requisito da API para registrar uma entrega.
      const matricula = await request(apiUrl)
        .post(`/api/admin/disciplinas/${cenario.disciplinaId}/matriculas`)
        .auth(admin.body.token, { type: 'bearer' })
        .send({ alunoId })
        .expect(201);
      expect(matricula.body).to.include({ alunoId, disciplinaId: cenario.disciplinaId });

      const aluno = await loginUsuario(dadosAluno);
      expect(aluno.body.usuario).to.include({ id: alunoId, email: dadosAluno.email, role: 'aluno' });

      const entrega = await request(apiUrl)
        .post(`/api/alunos/${alunoId}/trabalhos`)
        .auth(aluno.body.token, { type: 'bearer' })
        .send({ disciplinaId: cenario.disciplinaId, ...cenario.trabalho })
        .expect(201);
      expect(entrega.body.id).to.be.a('string').and.not.be.empty;
      expect(entrega.body).to.include({
        alunoId,
        disciplinaId: cenario.disciplinaId,
        titulo: cenario.trabalho.titulo,
        descricao: cenario.trabalho.descricao ?? null,
        status: cenario.statusEsperado,
        nota: null,
        feedback: null,
      });
      expect(Number.isNaN(Date.parse(entrega.body.dataEntrega))).to.equal(false);

      const consulta = await request(apiUrl)
        .get(`/api/alunos/${alunoId}/trabalhos`)
        .auth(aluno.body.token, { type: 'bearer' })
        .expect(200);
      expect(consulta.body).to.be.an('array').with.lengthOf(1);
      expect(consulta.body[0]).to.deep.equal(entrega.body);
    });
  }
});
