using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace AutoFilling
{
    public static class GridSerializer
    {
        // Clase unificada para el JSON que consume Three.js
        public class Item3D
        {
            public string Tipo { get; set; } = "";     // "Lona", "Pad", "Malla", "Poste", "Entrada"
            public string Subtipo { get; set; } = "";  // "Estructural", "Intermedio", "Centro"
            public int X { get; set; }
            public int Y { get; set; }
            public int Rotacion { get; set; }
            
            // Conectores de base (Resortes)
            public bool StickUp { get; set; }
            public bool StickDown { get; set; }
            public bool StickLeft { get; set; }
            public bool StickRight { get; set; }

            // Identificador de posición para postes (TL, TR, BL, BR)
            public string Details { get; set; } = "";
        }

        public static string GenerarJson(GridState state)
        {
            var lista = new List<Item3D>();

            for (int r = 0; r < state.Filas; r++)
            {
                for (int c = 0; c < state.Columnas; c++)
                {
                    if (!Ocupado(state, r, c)) continue;

                    // 1. PROCESAR BASE (PAD / LONA)
                    // -------------------------------------------------------
                    var rect = state.Rectangulos.First(x => r >= x.R1 && r <= x.R2 && c >= x.C1 && c <= x.C2);
                    bool esBordeBase = (r == rect.R1 || r == rect.R2 || c == rect.C1 || c == rect.C2);
                    
                    var itemBase = new Item3D 
                    { 
                        Tipo = esBordeBase ? "Pad" : "Lona", 
                        X = c, Y = r, 
                        Rotacion = 0 
                    };

                    // Configurar Sticks (apuntan al centro del rectangulo)
                    if (r == rect.R1) itemBase.StickDown = true;
                    if (r == rect.R2) itemBase.StickUp = true;
                    if (c == rect.C1) itemBase.StickRight = true;
                    if (c == rect.C2) itemBase.StickLeft = true;
                    
                    lista.Add(itemBase);


                    // 2. PROCESAR MALLAS O ENTRADAS (PERÍMETRO)
                    // -------------------------------------------------------
                    bool mTop = !Ocupado(state, r - 1, c);
                    bool mBottom = !Ocupado(state, r + 1, c);
                    bool mLeft = !Ocupado(state, r, c - 1);
                    bool mRight = !Ocupado(state, r, c + 1);

                    // Lado Arriba (Norte - Rot 0)
                    if (mTop) ProcesarLado(state, lista, r, c, "Top", 0);
                    // Lado Abajo (Sur - Rot 180)
                    if (mBottom) ProcesarLado(state, lista, r, c, "Bottom", 180);
                    // Lado Izquierdo (Oeste - Rot 90)
                    if (mLeft) ProcesarLado(state, lista, r, c, "Left", 90);
                    // Lado Derecho (Este - Rot 270)
                    if (mRight) ProcesarLado(state, lista, r, c, "Right", 270);


                    // 3. PROCESAR POSTES (LÓGICA INTELIGENTE)
                    // -------------------------------------------------------
                    
                    // Poste Top-Left
                    if (mTop || mLeft) {
                        bool esRectaH = mTop && TieneMuro(state, r, c - 1, "Top") && !mLeft && !TieneMuro(state, r - 1, c, "Left");
                        bool esRectaV = mLeft && TieneMuro(state, r - 1, c, "Left") && !mTop && !TieneMuro(state, r, c - 1, "Top");
                        AgregarPoste(state, lista, r, c, "TL", !(esRectaH || esRectaV));
                    }
                    // Poste Top-Right
                    if (mTop || mRight) {
                        bool esRectaH = mTop && TieneMuro(state, r, c + 1, "Top") && !mRight && !TieneMuro(state, r - 1, c, "Right");
                        bool esRectaV = mRight && TieneMuro(state, r - 1, c, "Right") && !mTop && !TieneMuro(state, r, c + 1, "Top");
                        AgregarPoste(state, lista, r, c, "TR", !(esRectaH || esRectaV));
                    }
                    // Poste Bottom-Left
                    if (mBottom || mLeft) {
                        bool esRectaH = mBottom && TieneMuro(state, r, c - 1, "Bottom") && !mLeft && !TieneMuro(state, r + 1, c, "Left");
                        bool esRectaV = mLeft && TieneMuro(state, r + 1, c, "Left") && !mBottom && !TieneMuro(state, r, c - 1, "Bottom");
                        AgregarPoste(state, lista, r, c, "BL", !(esRectaH || esRectaV));
                    }
                    // Poste Bottom-Right
                    if (mBottom || mRight) {
                        bool esRectaH = mBottom && TieneMuro(state, r, c + 1, "Bottom") && !mRight && !TieneMuro(state, r + 1, c, "Right");
                        bool esRectaV = mRight && TieneMuro(state, r + 1, c, "Right") && !mBottom && !TieneMuro(state, r, c + 1, "Bottom");
                        AgregarPoste(state, lista, r, c, "BR", !(esRectaH || esRectaV));
                    }
                }
            }
            return JsonSerializer.Serialize(lista);
        }

        // --- HELPERS ---

        private static bool Ocupado(GridState s, int r, int c) 
            => s.Rectangulos.Any(rect => r >= rect.R1 && r <= rect.R2 && c >= rect.C1 && c <= rect.C2);

        private static bool TieneMuro(GridState s, int r, int c, string lado)
        {
            if (!Ocupado(s, r, c)) return false;
            if (lado == "Top") return !Ocupado(s, r - 1, c);
            if (lado == "Bottom") return !Ocupado(s, r + 1, c);
            if (lado == "Left") return !Ocupado(s, r, c - 1);
            if (lado == "Right") return !Ocupado(s, r, c + 1);
            return false;
        }

        private static void ProcesarLado(GridState s, List<Item3D> lista, int r, int c, string lado, int rot)
        {
            // Verificamos si en este punto el usuario definió una entrada
            bool esEntrada = s.Entradas.Contains($"{r},{c},{lado}");
            
            lista.Add(new Item3D { 
                Tipo = esEntrada ? "Entrada" : "Malla", 
                X = c, 
                Y = r, 
                Rotacion = rot 
            });
        }

        private static void AgregarPoste(GridState s, List<Item3D> lista, int r, int c, string pos, bool obligatorio)
        {
            bool activoManual = s.PostesActivos.Contains($"{r},{c},{pos}");
            
            // Si es esquina (obligatorio) o si el usuario lo encendió manualmente
            if (obligatorio || activoManual)
            {
                lista.Add(new Item3D 
                { 
                    Tipo = "Poste", 
                    Subtipo = obligatorio ? "Estructural" : "Intermedio",
                    X = c, 
                    Y = r, 
                    Rotacion = 0,
                    Details = pos 
                });
            }
        }
    }
}