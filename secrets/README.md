# Secrets

Only `*.enc.env` files (sops + age encrypted) are committed here. Plaintext
never is; `.gitignore` enforces it and gitleaks runs in CI.

- Who can decrypt: the age recipients in `.sops.yaml` (founder key + CI key).
- How CI uses them: `deploy.yml` decrypts the destination's file into the
  environment of the `kamal` process only, via `sops exec-env`.
- How you use them locally: `bin/kamal ... -d staging` does the same.
- Rotation: change the value with `sops secrets/<env>.enc.env`, redeploy
  (`kamal env push` is not needed in Kamal 2; secrets are injected at deploy).
  For database role passwords also `alter role ... password` on the host.

See `secrets/example.env` for the variable list and `infra/README.md` for the
bootstrap order.
