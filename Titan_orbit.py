#!/bin/python
import sys
import numpy as np

class TITAN:
    '''Titan orbit functions and parametes'''

    def __init__(self):
        '''Init default parameters'''
        self.Tday = 15.945  # Earth days / 1 Saturn orbit

        # Default orbit parameters calculated with NAIF Space Kernels
        self.date  = [np.datetime64('1980-01-02'),np.datetime64('2032-12-31')]
        self.obl   = 26.730882944988142
        self.orbit = np.timedelta64(10751,'D')
        self.eq_v  = [np.datetime64('1980-02-22'), np.datetime64('2009-07-30')]
        self.sol_s = [np.datetime64('1987-11-25'), np.datetime64('2017-05-14')]
        self.eq_a  = [np.datetime64('1995-11-07'), np.datetime64('2025-04-24')]
        self.sol_w = [np.datetime64('2002-10-23'), np.datetime64('2032-03-26')]
        self.aphs  = [np.datetime64('2003-07-21'), np.datetime64('2032-11-21')]
        self.pers  = [np.datetime64('1988-08-31'), np.datetime64('2018-04-07')]
        self.r_v   =  9.443302157356690
        self.r_s   = 10.030529604959204
        self.r_a   =  9.587968538637037
        self.r_w   =  9.031185737728954
        self.r_aph =  9.0077428463331
        self.r_per = 10.0728723166560
        self.A     =  6.1664830805512354
        self.B     =  6.0482745790986066
        self.C     = 101.03535416292833
        return

    def __repr__(self):
        return 'Titan orbit functions and parametes'

    def read(self,fname='NAIF-Titan.dat',usecols=(0,5,6,7),skiprows=21):
        '''Read an orbital input file

        Parameters
        -----------
        fname : str
            Input file location
        usecols : tuple
            List of column containing:
                - T : date ('YYYY-MM-DD' format)
                - Z : elevation of the subsolar point (km)
                - R : sub-point radius (km)
                - D : distance to the Sun (km)
        skiprows : tuple
            Number of line of the header to skip.

        Init
        -----
        date : numpy.array( numpy.datetime64[D] )
            Date of the calculated position of the planet.
        lat : numpy.array
            Sub solar point latitude (degN).
        dist : numpy.array
            Distance to the Sun (U.A.)
        '''
        ua = 149597870.7 # 1 Astronomical unit (km)
        T,Z,R,D = np.loadtxt(fname, unpack=True, dtype=(str),
                            skiprows=skiprows, usecols=usecols)

        self.date = T.astype(dtype='datetime64[D]')
        self.lat  = np.degrees( np.arcsin( np.double(Z)/np.double(R) ) )
        self.dist = np.double(D) / ua
        return

    def setObliquity(self):
        '''Set the planet obliquity = Solar latitude maximal extension.'''
        self.obl = np.max( np.abs(self.lat) )
        return

    def setEquinox(self):
        '''Search for the equinox dates and the orbit duration'''
        eqs = []; d_eq = self.date[0]; l_eq = 90.
        cond = ( np.abs(self.lat) < .05 )
        for l,d in zip(np.abs(self.lat[cond]),self.date[cond]):
            if l < l_eq:
                l_eq = l
                d_eq = d
            elif (d - d_eq) > np.timedelta64(20,'D'):
                l_eq = 90
                eqs.append( d_eq )
        if d_eq != self.date[-1]:
            eqs.append( d_eq )

        # Split equinox (Vernal/Autumnal)
        if self.lat[cond][0] < 0 :
            self.eq_v = eqs[::2]  # Vernal   equinox
            self.eq_a = eqs[1::2] # Autumnal equinox
        else:
            self.eq_v = eqs[1::2] # Vernal   equinox
            self.eq_a = eqs[::2]  # Autumnal equinox

        self.r_v = self.dist[ self.date == self.eq_v[0] ][0]
        self.r_a = self.dist[ self.date == self.eq_a[0] ][0]

        # Set orbit duration (Earth days)
        if len(self.eq_v) < 2:
            raise ValueError('You need at least 2 vernal equinox to estimate the orbit duration')
        self.orbit = self.eq_v[1] - self.eq_v[0]
        return

    def setSolstice(self):
        '''Search for the solstice dates'''
        sols = []; d_sol = self.date[0]; l_sol = 0.
        cond = ( np.abs(self.lat) > .999 * self.obl )
        for l,d in zip(np.abs(self.lat[cond]),self.date[cond]):
            if l > l_sol:
                l_sol = l
                d_sol = d
            elif (d - d_sol) > self.orbit/4:
                l_sol = 0
                sols.append( d_sol )
        if d_sol != self.date[-1]:
            sols.append( d_sol )

        # Split solstice (Summer/Winter)
        if self.eq_v[0] < sols[0] and sols[0] < self.eq_a[0] :
            self.sol_s = sols[::2]  # Summer solstice
            self.sol_w = sols[1::2] # Winter solstice
        else:
            self.sol_s = sols[1::2] # Summer solstice
            self.sol_w = sols[::2]  # Winter solstice

        self.r_s = self.dist[ self.date == self.sol_s[0] ][0]
        self.r_w = self.dist[ self.date == self.sol_w[0] ][0]
        return

    def setAphelion(self):
        '''Search for the aphelion position (closest distance to the Sun)'''
        self.r_aph = np.min(self.dist)
        self.aphs = []; d_aph = self.date[0]; l_aph = 1.01 * self.r_aph
        cond = ( self.dist < 1.01 * self.r_aph )
        for l,d in zip(self.dist[cond],self.date[cond]):
            if l < l_aph:
                l_aph = l
                d_aph = d
            elif (d - d_aph) > self.orbit/4:
                l_aph = 1.01 * self.r_aph
                self.aphs.append( d_aph )
        if d_aph != self.date[-1]:
            self.aphs.append( d_aph )
        return

    def setPerihelion(self):
        '''Search for the perihelion position (farest distance to the Sun)'''
        self.r_per = np.max(self.dist)
        self.pers = []; d_per = self.date[0]; l_per = .99 * self.r_per
        cond = ( self.dist > .99 * self.r_per )
        for l,d in zip(self.dist[cond],self.date[cond]):
            if l > l_per:
                l_per = l
                d_per = d
            elif (d - d_per) > self.orbit/4:
                l_per = .99 * self.r_per
                self.pers.append( d_per )
        if d_per != self.date[-1]:
            self.pers.append( d_per )
        return

    def fitLs(self,plot=False):
        '''Fit the Solar longitude parameters'''
        import scipy.optimize as sp
        Ls   = np.array([0,90,180,270])
        date = np.array([self.eq_v[0], self.sol_s[0], self.eq_a[0], self.sol_w[0] ])
        dLs  = 360. * (date-self.eq_v[0]).astype(float) / self.orbit.astype(float) - Ls

        param_bounds = ([-360,-360,0],[360,360,180])
        def f(t,A,B,C): return A * np.sin(2*np.pi*(t-C)/360.) + B
        popt,_ = sp.curve_fit(f, Ls, dLs, bounds=param_bounds)
        self.A,self.B,self.C = popt
        if plot:
            import matplotlib.pyplot as plt
            x = np.linspace(0,360,100)
            plt.figure()
            plt.plot(Ls,dLs,'ro')
            plt.plot(x,f(x,*popt),'b-')
            plt.show()
        return

    def reload(self):
        '''Reload all with default parameters'''
        self.read()
        self.setObliquity()
        self.setEquinox()
        self.setSolstice()
        self.setAphelion()
        self.setPerihelion()
        self.fitLs()
        self.dump()
        return

    def dump(self):
        '''Dump all the orbital parameters'''
        orbit_y = self.orbit.astype('timedelta64[Y]').astype(int)
        orbit_m = self.orbit.astype('timedelta64[M]').astype(int) - 12 * orbit_y
        orbit_d = self.orbit.astype(int) - np.timedelta64(orbit_y,'Y').astype('timedelta64[D]').astype(int) - np.timedelta64(orbit_m,'M').astype('timedelta64[D]').astype(int)

        spring = self.sol_s[0] - self.eq_v[0]
        summer = self.eq_a[0]  - self.sol_s[0]
        autumn = self.sol_w[0] - self.eq_a[0]
        winter = self.eq_v[1]  - self.sol_w[0]

        print 'Date coverage: %s | %s' % ( self.date[0], self.date[-1] )
        print 'Orbit       : %s (Earth) = %i years %i months %i days | %s (Titan)' % ( self.orbit, orbit_y,orbit_m,orbit_d,self.orbit/self.Tday )
        print 'Equinox  (V): %s ' % (' | '.join(str(eq)  for eq  in self.eq_v ) )
        print 'Solstice (S): %s ' % (' | '.join(str(sol) for sol in self.sol_s) )
        print 'Equinox  (A): %s ' % (' | '.join(str(eq)  for eq  in self.eq_a ) )
        print 'Solstice (W): %s ' % (' | '.join(str(sol) for sol in self.sol_w) )
        print 'Obliquity   : %.2f deg' % self.obl
        print 'N Spring    : %s (Earth) | %s (Titan) | Ls =   0 | R = %.2f UA' % ( spring, spring/self.Tday, self.r_v )
        print 'N Summer    : %s (Earth) | %s (Titan) | Ls =  90 | R = %.2f UA' % ( summer, summer/self.Tday, self.r_s )
        print 'N Autumn    : %s (Earth) | %s (Titan) | Ls = 180 | R = %.2f UA' % ( autumn, autumn/self.Tday, self.r_a )
        print 'N Winter    : %s (Earth) | %s (Titan) | Ls = 270 | R = %.2f UA' % ( winter, winter/self.Tday, self.r_w )
        print 'Perihelion  : %s | %.2f UA' % (' | '.join(str(per) for per in self.pers), self.r_per )
        print 'Aphelion    : %s | %.2f UA' % (' | '.join(str(aph) for aph in self.aphs), self.r_aph )
        print '360*(Date - Eq_V)/orbit = Ls + A * sin[2.PI/360 * (Ls - C)] + B'
        print 'with: A = %.2f | B = %.2f | C = %.2f' % (self.A,self.B,self.C)
        return

    def Ls(self,date,eps=1.e-7,imax=25):
        '''Calculate the solar longitude corresponding to a date.

        Parameters
        -----------
        date : str, numpy.datetime64
            Input date (YYYY-MM-DD or YYYY/MM/DD)
        eps : float, optional
            Precision of the convergence
        imax : int, optional
            Number maximum of iteration to reach the convergence, throw a ValueError otherwise.

        Note
        -----
        The value of Ls is the solution of a transcendental equation which
        is numerically solved with the Newton method:
        $$L_s^0 = 360 \cdot \frac{\text{Date} - \text{Eq}^V}{\text{Orbit}} - B\\
        L_s^{n+1} = L_s^n - \frac{
        L_s^n - L_s^0 + A\cdot\sin\left(2\pi\cdot \frac{L_s^n - C}{360} \right)
        }{
        1 + A\cdot\frac{2\pi}{360}\cos\left(2\pi\cdot \frac{L_s^n - C}{360} \right)
        }$$

        Return
        -------
        Ls : real
            Solar latitude corresponding to the input date
        '''
        if type(date) == str: date = np.datetime64(date.replace('/','-'),'D')
        Ls_0 = ( (360.*(date - self.eq_v[0]).astype(int))/self.orbit.astype(float) - self.B ) % 360
        Ls   = Ls_0
        for ii in range(imax):
            dLs = - (Ls - Ls_0 + self.A * np.sin(2*np.pi*(Ls-self.C)/360.) )         \
                   /( 1 + self.A *2*np.pi/360.* np.sin(2*np.pi*(Ls-self.C)/360.) )
            Ls = Ls + dLs
            if np.abs(dLs) < eps:
                break
        if ii >= imax:
            raise ValueError('Max number of iteration reach without getting convergence.')
        return Ls % 360

    def Date(self,Ls,Ty=0):
        '''Calculate the date corresponding to a solar longitude.

        Parameters
        -----------
        Ls : real
            Input solar latitude
        Ty : int, optional
            Number of Titan year after 1980-02-22 (Vernal Equinox before Voyager 1)

        Return
        -------
        date : numpy.datetime64
            Date corresponding to the input solar latitude
        '''
        date = np.round(self.orbit.astype(int)/360. * (Ls + self.A * np.sin(2*np.pi*(Ls-self.C)/360.) + self.B + 360 * Ty))
        return self.eq_v[0] + np.timedelta64(int(date),'D')


if __name__ == '__main__':

    titan = TITAN()

    if len(sys.argv) > 1:
        for arg in sys.argv:
            if arg.lower() == 'info':
                titan.dump()
            elif arg.lower() == 'fit':
                titan.fitLs(plot=True)
            elif arg.lower() in ['naif','spice','load','reload','read','import']:
                titan.reload()
            elif len(arg) == 10 :
                print 'Ls: %.2f' % titan.Ls( arg )
            else:
                try:
                    if '+' in arg:
                        _arg = arg.split('+')
                        Ls = float(_arg[0])
                        Ty = int(_arg[1])
                    else:
                        Ls = float(arg)
                        Ty = 0
                    print 'Date: %s' % titan.Date(Ls,Ty=Ty)
                except ValueError:
                    pass
    else:
        titan.dump()
