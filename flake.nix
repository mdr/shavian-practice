{
  description = "Shavian writing practice — iPad/Pencil handwriting trainer (static site)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        # ngrok is proprietary, so this package set permits unfree packages.
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.ngrok
          ];

          shellHook = ''
            echo "shavian-practice dev shell — node $(node -v), pnpm $(pnpm -v), ngrok $(ngrok --version | head -1)"
          '';
        };
      });
}
